import Banner from "../models/banner.model.js";

const normalizeString = (value) => (value === undefined || value === null ? "" : String(value).trim());

/** Route docs use `:banner_id`; clients sometimes paste `:uuid` into the path. */
const normalizeBannerId = (value) => {
  const s = normalizeString(value);
  return s.startsWith(":") ? s.slice(1) : s;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 0 = inactive, 1 = active */
const parseStatus = (value, { required = false, defaultValue = 1 } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new Error("status is required");
    }
    return defaultValue;
  }
  const n = parseInt(String(value).trim(), 10);
  if (n === 0 || n === 1) {
    return n;
  }
  throw new Error("status must be 0 or 1");
};

const selectPublicFields = "banner_id title description banner_image order_url status -_id";

export const BannerService = {
  createBanner: async ({ title, description, banner_image, order_url, status }) => {
    const normalizedTitle = normalizeString(title);
    const normalizedOrderUrl = normalizeString(order_url);
    const normalizedStatus = parseStatus(status, { defaultValue: 1 });

    if (!normalizedTitle) {
      throw new Error("title is required");
    }
    if (!normalizedOrderUrl) {
      throw new Error("order_url is required");
    }

    const doc = await Banner.create({
      title: normalizedTitle,
      description: description !== undefined ? normalizeString(description) : "",
      banner_image: banner_image ? normalizeString(banner_image) : "",
      order_url: normalizedOrderUrl,
      status: normalizedStatus,
    });

    return {
      banner_id: doc.banner_id,
      title: doc.title,
      description: doc.description,
      banner_image: doc.banner_image,
      order_url: doc.order_url,
      status: doc.status,
    };
  },

  listBanners: async ({ page = 1, limit = 10, search = "", status: statusFilter } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};
    const normalizedSearch = normalizeString(search);

    if (statusFilter !== undefined && statusFilter !== null && normalizeString(statusFilter) !== "") {
      filter.status = parseStatus(statusFilter, { required: true });
    }

    if (normalizedSearch) {
      const searchRegex = new RegExp(escapeRegex(normalizedSearch), "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { banner_image: searchRegex },
        { order_url: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      Banner.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select(selectPublicFields)
        .lean()
        .exec(),
      Banner.countDocuments(filter),
    ]);

    const normalizedItems = items.map((row) => ({
      ...row,
      status: row.status === 0 ? 0 : 1,
    }));

    return {
      items: normalizedItems,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage < Math.ceil(total / parsedLimit),
        hasPrevPage: parsedPage > 1,
      },
    };
  },

  /** Active banners only (status = 1). Public storefront use. */
  listBannerImg: async ({ page = 1, limit = 10, search = "" } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { status: 1 };
    const normalizedSearch = normalizeString(search);

    if (normalizedSearch) {
      const searchRegex = new RegExp(escapeRegex(normalizedSearch), "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { banner_image: searchRegex },
        { order_url: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      Banner.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select(selectPublicFields)
        .lean()
        .exec(),
      Banner.countDocuments(filter),
    ]);

    const normalizedItems = items.map((row) => ({
      ...row,
      status: 1,
    }));

    return {
      items: normalizedItems,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage < Math.ceil(total / parsedLimit),
        hasPrevPage: parsedPage > 1,
      },
    };
  },

  getBannerById: async ({ banner_id }) => {
    const id = normalizeBannerId(banner_id);
    if (!id) {
      throw new Error("banner_id is required");
    }

    const doc = await Banner.findOne({
      banner_id: id,
    })
      .select(selectPublicFields)
      .lean()
      .exec();

    if (!doc) {
      throw new Error("Banner not found");
    }

    return {
      ...doc,
      status: doc.status === 0 ? 0 : 1,
    };
  },

  updateBanner: async ({ banner_id, title, description, banner_image, order_url, status }) => {
    const id = normalizeBannerId(banner_id);
    if (!id) {
      throw new Error("banner_id is required");
    }

    const hasAnyUpdate =
      title !== undefined ||
      description !== undefined ||
      banner_image !== undefined ||
      order_url !== undefined ||
      status !== undefined;

    if (!hasAnyUpdate) {
      throw new Error("At least one of title, description, banner_image, order_url, or status is required");
    }

    const doc = await Banner.findOne({
      banner_id: id,
    }).exec();

    if (!doc) {
      throw new Error("Banner not found");
    }

    if (title !== undefined) {
      const t = normalizeString(title);
      if (!t) {
        throw new Error("title cannot be empty");
      }
      doc.title = t;
    }

    if (description !== undefined) {
      doc.description = normalizeString(description);
    }

    if (banner_image !== undefined) {
      doc.banner_image = normalizeString(banner_image);
    }

    if (order_url !== undefined) {
      const u = normalizeString(order_url);
      if (!u) {
        throw new Error("order_url cannot be empty");
      }
      doc.order_url = u;
    }

    if (status !== undefined) {
      doc.status = parseStatus(status, { required: true });
    }

    await doc.save();

    return {
      banner_id: doc.banner_id,
      title: doc.title,
      description: doc.description,
      banner_image: doc.banner_image,
      order_url: doc.order_url,
      status: doc.status,
    };
  },

  deleteBanner: async ({ banner_id }) => {
    const id = normalizeBannerId(banner_id);
    if (!id) {
      throw new Error("banner_id is required");
    }

    const result = await Banner.deleteOne({ banner_id: id });

    if (result.deletedCount === 0) {
      throw new Error("Banner not found");
    }

    return { banner_id: id };
  },
};

export default BannerService;
