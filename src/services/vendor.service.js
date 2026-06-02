import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Warehouse from "../models/warehouse.model.js";
import WarehouseInventory from "../models/warehouse-inventory.model.js";

const VENDOR_ROLE = "Vendor";

const normalizeString = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const normalizeId = (value) => normalizeString(value).replace(/^:/, "");

const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const parseStatus = (value, { defaultValue = 1 } = {}) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const n = parseInt(String(value).trim(), 10);
  if (n === 0 || n === 1) {
    return n;
  }
  throw new Error("status must be 0 or 1");
};

const vendorFilter = (extra = {}) => ({ role: VENDOR_ROLE, ...extra });

const selectFields =
  "user_id name code email phone address gst_number status createdAt updatedAt -_id";

const mapVendor = (doc) => ({
  vendor_id: doc.user_id,
  name: doc.name,
  code: doc.code || "",
  email: doc.email || "",
  phone: doc.phone || "",
  address: doc.address || "",
  gst_number: doc.gst_number || "",
  status: doc.status === 0 ? 0 : 1,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const findVendorById = async (vendor_id) => {
  const id = normalizeId(vendor_id);
  if (!id) {
    throw new Error("vendor_id is required");
  }
  const doc = await User.findOne(vendorFilter({ user_id: id })).select(selectFields).lean().exec();
  if (!doc) {
    throw new Error("Vendor not found");
  }
  return doc;
};

export const VendorService = {
  createVendor: async ({ name, email, phone, address, gst_number, code, status, password }) => {
    const normalizedName = normalizeString(name);
    if (!normalizedName) {
      throw new Error("name is required");
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error("email is required");
    }

    const existingEmail = await User.findOne({ email: normalizedEmail }).exec();
    if (existingEmail) {
      throw new Error("Vendor already exists");
    }

    const existingName = await User.findOne(vendorFilter({ name: normalizedName })).exec();
    if (existingName) {
      throw new Error("Vendor already exists");
    }

    const normalizedCode = normalizeString(code);
    if (normalizedCode) {
      const codeDuplicate = await User.findOne(vendorFilter({ code: normalizedCode })).exec();
      if (codeDuplicate) {
        throw new Error("Vendor code already exists");
      }
    }

    const payload = {
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizeString(phone),
      address: normalizeString(address),
      gst_number: normalizeString(gst_number),
      code: normalizedCode,
      status: parseStatus(status),
      role: VENDOR_ROLE,
      passwordHash: "",
    };

    if (password !== undefined && password !== null && normalizeString(password) !== "") {
      payload.passwordHash = await bcrypt.hash(String(password), 10);
    }

    const doc = await User.create(payload);
    return mapVendor(doc);
  },

  listVendors: async ({ page = 1, limit = 10, search = "", status } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = vendorFilter();
    const normalizedSearch = normalizeString(search);

    if (normalizedSearch) {
      const regex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { code: regex }, { email: regex }, { phone: regex }];
    }

    if (status !== undefined && status !== null && normalizeString(status) !== "") {
      filter.status = parseStatus(status, { required: true });
    }

    const [rows, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select(selectFields)
        .lean()
        .exec(),
      User.countDocuments(filter),
    ]);

    return {
      items: rows.map(mapVendor),
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

  getVendorById: async ({ vendor_id }) => {
    const doc = await findVendorById(vendor_id);
    return mapVendor(doc);
  },

  updateVendor: async ({ vendor_id, name, code, email, phone, address, gst_number, status, password }) => {
    const id = normalizeId(vendor_id);
    if (!id) {
      throw new Error("vendor_id is required");
    }

    const hasAnyUpdate =
      name !== undefined ||
      code !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      address !== undefined ||
      gst_number !== undefined ||
      status !== undefined ||
      password !== undefined;

    if (!hasAnyUpdate) {
      throw new Error("At least one field is required to update");
    }

    const doc = await User.findOne(vendorFilter({ user_id: id })).exec();
    if (!doc) {
      throw new Error("Vendor not found");
    }

    if (name !== undefined) {
      const normalizedName = normalizeString(name);
      if (!normalizedName) {
        throw new Error("name cannot be empty");
      }
      const duplicate = await User.findOne({
        ...vendorFilter({ name: normalizedName }),
        user_id: { $ne: id },
      }).exec();
      if (duplicate) {
        throw new Error("Vendor name already exists");
      }
      doc.name = normalizedName;
    }

    if (code !== undefined) {
      const normalizedCode = normalizeString(code);
      if (normalizedCode) {
        const codeDuplicate = await User.findOne({
          ...vendorFilter({ code: normalizedCode }),
          user_id: { $ne: id },
        }).exec();
        if (codeDuplicate) {
          throw new Error("Vendor code already exists");
        }
      }
      doc.code = normalizedCode;
    }

    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        throw new Error("email cannot be empty");
      }
      const emailDuplicate = await User.findOne({
        email: normalizedEmail,
        user_id: { $ne: id },
      }).exec();
      if (emailDuplicate) {
        throw new Error("Email already in use");
      }
      doc.email = normalizedEmail;
    }

    if (phone !== undefined) doc.phone = normalizeString(phone);
    if (address !== undefined) doc.address = normalizeString(address);
    if (gst_number !== undefined) doc.gst_number = normalizeString(gst_number);
    if (status !== undefined) doc.status = parseStatus(status, { required: true });
    if (password !== undefined && password !== null && normalizeString(password) !== "") {
      doc.passwordHash = await bcrypt.hash(String(password), 10);
    }

    await doc.save();
    return mapVendor(doc);
  },

  deleteVendor: async ({ vendor_id }) => {
    const id = normalizeId(vendor_id);
    if (!id) {
      throw new Error("vendor_id is required");
    }

    const doc = await User.findOne(vendorFilter({ user_id: id })).exec();
    if (!doc) {
      throw new Error("Vendor not found");
    }

    const warehouses = await Warehouse.find({ vendor_id: id }).select("warehouse_id -_id").lean().exec();
    const warehouseIds = warehouses.map((w) => w.warehouse_id);

    await Promise.all([
      User.deleteOne({ user_id: id, role: VENDOR_ROLE }),
      Warehouse.deleteMany({ vendor_id: id }),
      warehouseIds.length
        ? WarehouseInventory.deleteMany({ warehouse_id: { $in: warehouseIds } })
        : Promise.resolve(),
    ]);

    return { vendor_id: id };
  },
};

export default VendorService;
