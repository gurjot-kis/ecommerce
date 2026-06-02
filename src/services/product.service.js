import Category from "../models/category.model.js";
import SubCategory from "../models/sub-category.model.js";
import Product from "../models/product.model.js";

const toStringOrEmpty = (value) => (value ? String(value).trim() : "");
const toUpper = (value) => String(value).trim().toUpperCase();
const toSlug = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const normalizeProductId = (value) => String(value).trim().replace(/^:/, "");
const normalizeId = (value) => (value ? String(value).trim() : "");

const assertCanModifyProduct = (product, actor) => {
  if (!actor?.role || actor.role === "SuperAdmin") {
    return;
  }

  if (actor.role === "Vendor" && product.user_id === actor.user_id) {
    return;
  }

  throw new Error("Forbidden: you can only modify your own products");
};

/** Accepts array, JSON string, comma-separated URLs, or single URL (common with multipart/form-data). */
export const normalizeFeaturedImagesInput = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((img) => toStringOrEmpty(img)).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((img) => toStringOrEmpty(img)).filter(Boolean);
        }
      } catch {
        // fall through to single-value handling
      }
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((img) => toStringOrEmpty(img))
        .filter(Boolean);
    }

    return [trimmed];
  }

  throw new Error("featuredImages must be an array");
};

const mapProduct = (product) => ({
  product_id: product.product_id,
  name: product.name,
  description: product.description,
  shortDescription: product.shortDescription,
  category_id: product.category_id,
  sub_category_id: product.sub_category_id,
  mainImage: product.mainImage,
  featuredImages: product.featuredImages,
  sku: product.sku,
  status: product.status,
  currency: product.currency,
  stock: product.stock,
  slug: product.slug,
  stockStatus: product.stockStatus,
  costPrice: product.costPrice,
  sellingPrice: product.sellingPrice,
  price: product.price,
  role: product.role,
  user_id: product.user_id,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const mapPublicCategory = (category) => ({
  category_id: category.category_id,
  name: category.name,
  description: category.description || "",
  category_image: category.category_image || "",
});

const mapPublicSubCategory = (subCategory) => ({
  sub_category_id: subCategory.sub_category_id,
  category_id: subCategory.category_id,
  name: subCategory.name,
  description: subCategory.description || "",
  sub_category_image: subCategory.sub_category_image || "",
});

const validateCategoryAndSubCategory = async (category_id, sub_category_id) => {
  const category = await Category.findOne({
    category_id: String(category_id).trim(),
  }).exec();

  if (!category) {
    throw new Error("Category not found");
  }

  const subCategory = await SubCategory.findOne({
    sub_category_id: String(sub_category_id).trim(),
    category_id: String(category_id).trim(),
  }).exec();

  if (!subCategory) {
    throw new Error("Sub-category not found in this category");
  }
};

const validateCategoryExists = async (category_id) => {
  const category = await Category.findOne({
    category_id: String(category_id).trim(),
  }).exec();

  if (!category) {
    throw new Error("Category not found");
  }
};

const resolveCategoryAndSubCategory = async ({ category_id, sub_category_id }) => {
  const normalizedCategoryId = normalizeId(category_id);
  const normalizedSubCategoryId = normalizeId(sub_category_id);

  if (!normalizedCategoryId) {
    throw new Error("category_id is required");
  }

  if (normalizedSubCategoryId) {
    await validateCategoryAndSubCategory(normalizedCategoryId, normalizedSubCategoryId);
    return {
      category_id: normalizedCategoryId,
      sub_category_id: normalizedSubCategoryId,
    };
  }

  await validateCategoryExists(normalizedCategoryId);

  return {
    category_id: normalizedCategoryId,
    sub_category_id: "",
  };
};

export const ProductService = {
  createProduct: async (payload) => {
    const {
      name,
      description,
      shortDescription,
      category_id,
      category,
      sub_category_id,
      subCategory,
      sub_category,
      mainImage,
      featuredImages,
      sku,
      status,
      currency,
      stock,
      slug,
      stockStatus,
      costPrice,
      sellingPrice,
      price,
      role,
      user_id,
    } = payload || {};

    const inputCategoryId = category_id || category;
    const inputSubCategoryId = sub_category_id || subCategory || sub_category;

    if (
      !name ||
      !mainImage ||
      !sku ||
      !currency ||
      stock === undefined ||
      costPrice === undefined ||
      sellingPrice === undefined
    ) {
      throw new Error(
        "name, mainImage, sku, currency, stock, costPrice and sellingPrice are required"
      );
    }

    const normalizedRole = toStringOrEmpty(role);
    const normalizedUserId = toStringOrEmpty(user_id);
    if (!normalizedRole || !normalizedUserId) {
      throw new Error("role and user_id are required");
    }

    const resolvedIds = await resolveCategoryAndSubCategory({
      category_id: inputCategoryId,
      sub_category_id: inputSubCategoryId,
    });

    const normalizedSku = toStringOrEmpty(sku);
    const existingSku = await Product.findOne({ sku: normalizedSku }).exec();
    if (existingSku) {
      throw new Error("Product with same SKU already exists");
    }

    const finalSlug = slug ? toSlug(slug) : toSlug(name);
    const existingSlug = await Product.findOne({ slug: finalSlug }).exec();
    if (existingSlug) {
      throw new Error("Product with same slug already exists");
    }

    const product = await Product.create({
      name: toStringOrEmpty(name),
      description: toStringOrEmpty(description),
      shortDescription: toStringOrEmpty(shortDescription),
      category_id: toStringOrEmpty(resolvedIds.category_id),
      sub_category_id: toStringOrEmpty(resolvedIds.sub_category_id),
      mainImage: toStringOrEmpty(mainImage),
      featuredImages: normalizeFeaturedImagesInput(featuredImages) || [],
      sku: normalizedSku,
      status: status || "pending",
      currency: toUpper(currency),
      stock: Number(stock),
      slug: finalSlug,
      stockStatus: stockStatus || "in_stock",
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      price: Number(price ?? sellingPrice),
      role: normalizedRole,
      user_id: normalizedUserId,
    });

    return mapProduct(product);
  },

  updateProduct: async (product_id, payload, actor) => {
    if (!product_id) {
      throw new Error("product_id is required");
    }

    const product = await Product.findOne({
      product_id: normalizeProductId(product_id),
    }).exec();

    if (!product) {
      throw new Error("Product not found");
    }

    assertCanModifyProduct(product, actor);

    const nextCategoryId =
      payload?.category_id !== undefined || payload?.category !== undefined
        ? toStringOrEmpty(payload.category_id || payload.category)
        : product.category_id;
    const nextSubCategoryId =
      payload?.sub_category_id !== undefined ||
        payload?.subCategory !== undefined ||
        payload?.sub_category !== undefined
        ? toStringOrEmpty(
            payload.sub_category_id || payload.subCategory || payload.sub_category
          )
        : product.sub_category_id;

    if (payload?.category_id !== undefined || payload?.category !== undefined) {
      if (nextSubCategoryId) {
        await validateCategoryAndSubCategory(nextCategoryId, nextSubCategoryId);
      } else {
        await validateCategoryExists(nextCategoryId);
      }
    }

    if (
      payload?.sub_category_id !== undefined ||
      payload?.subCategory !== undefined ||
      payload?.sub_category !== undefined
    ) {
      if (nextSubCategoryId) {
        await validateCategoryAndSubCategory(nextCategoryId, nextSubCategoryId);
      } else {
        await validateCategoryExists(nextCategoryId);
      }
    }

    if (payload?.sku !== undefined) {
      const nextSku = toStringOrEmpty(payload.sku);
      if (!nextSku) {
        throw new Error("sku cannot be empty");
      }

      const sameSkuProduct = await Product.findOne({ sku: nextSku }).exec();
      if (sameSkuProduct && sameSkuProduct.product_id !== product.product_id) {
        throw new Error("Product with same SKU already exists");
      }

      product.sku = nextSku;
    }

    if (payload?.slug !== undefined || payload?.name !== undefined) {
      const candidateSlug = payload?.slug
        ? toSlug(payload.slug)
        : toSlug(payload?.name || product.name);

      if (!candidateSlug) {
        throw new Error("slug cannot be empty");
      }

      const sameSlugProduct = await Product.findOne({ slug: candidateSlug }).exec();
      if (sameSlugProduct && sameSlugProduct.product_id !== product.product_id) {
        throw new Error("Product with same slug already exists");
      }

      product.slug = candidateSlug;
    }

    if (payload?.name !== undefined) product.name = toStringOrEmpty(payload.name);
    if (payload?.description !== undefined) {
      product.description = toStringOrEmpty(payload.description);
    }
    if (payload?.shortDescription !== undefined) {
      product.shortDescription = toStringOrEmpty(payload.shortDescription);
    }
    if (payload?.category_id !== undefined || payload?.category !== undefined) {
      product.category_id = nextCategoryId;
    }
    if (
      payload?.sub_category_id !== undefined ||
      payload?.subCategory !== undefined ||
      payload?.sub_category !== undefined
    ) {
      product.sub_category_id = nextSubCategoryId;
    }
    if (payload?.mainImage !== undefined) product.mainImage = toStringOrEmpty(payload.mainImage);
    if (payload?.featuredImages !== undefined) {
      const normalizedFeatured = normalizeFeaturedImagesInput(payload.featuredImages);
      if (normalizedFeatured !== undefined) {
        product.featuredImages = normalizedFeatured;
      }
    }
    if (payload?.status !== undefined) product.status = toStringOrEmpty(payload.status);
    if (payload?.currency !== undefined) product.currency = toUpper(payload.currency);
    if (payload?.stock !== undefined) product.stock = Number(payload.stock);
    if (payload?.stockStatus !== undefined) {
      product.stockStatus = toStringOrEmpty(payload.stockStatus);
    }
    if (payload?.costPrice !== undefined) product.costPrice = Number(payload.costPrice);
    if (payload?.sellingPrice !== undefined) {
      product.sellingPrice = Number(payload.sellingPrice);
    }
    if (payload?.price !== undefined) {
      product.price = Number(payload.price);
    }

    await product.save();
    return mapProduct(product);
  },

  getProductById: async (product_id) => {
    if (!product_id) {
      throw new Error("product_id is required");
    }

    const product = await Product.findOne({
      product_id: normalizeProductId(product_id),
    })
      .lean()
      .exec();

    if (!product) {
      throw new Error("Product not found");
    }

    return mapProduct(product);
  },

  getProducts: async (query = {}) => {
    const parsedPage = Math.max(1, parseInt(query.page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (query?.category_id) {
      filter.category_id = toStringOrEmpty(query.category_id);
    }

    if (query?.sub_category_id) {
      filter.sub_category_id = toStringOrEmpty(query.sub_category_id);
    }

    if (query?.status) {
      filter.status = toStringOrEmpty(query.status);
    }

    if (query?.name && String(query.name).trim()) {
      filter.name = new RegExp(String(query.name).trim(), "i");
    }

    const filterUserId = toStringOrEmpty(query?.user_id);
    if (filterUserId) {
      filter.user_id = filterUserId;
    }

    const filterRole = toStringOrEmpty(query?.role);
    if (filterRole) {
      filter.role = filterRole;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean()
        .exec(),
      Product.countDocuments(filter),
    ]);

    // Collect unique IDs to fetch names in bulk
    const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean))];
    const subCategoryIds = [...new Set(products.map((p) => p.sub_category_id).filter(Boolean))];

    const [categories, subCategories] = await Promise.all([
      categoryIds.length
        ? Category.find({ category_id: { $in: categoryIds } })
            .select("category_id name -_id")
            .lean()
            .exec()
        : [],
      subCategoryIds.length
        ? SubCategory.find({ sub_category_id: { $in: subCategoryIds } })
            .select("sub_category_id name -_id")
            .lean()
            .exec()
        : [],
    ]);

    const categoryMap = Object.fromEntries(categories.map((c) => [c.category_id, c.name]));
    const subCategoryMap = Object.fromEntries(subCategories.map((s) => [s.sub_category_id, s.name]));

    const enriched = products.map((product) => ({
      ...mapProduct(product),
      category_name: categoryMap[product.category_id] || null,
      sub_category_name: subCategoryMap[product.sub_category_id] || null,
    }));

    return {
      products: enriched,
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

  getPublicProductsByCategory: async (category_id, { page = 1, limit = 10 } = {}) => {
    const normalizedCategoryId = toStringOrEmpty(category_id);
    if (!normalizedCategoryId) {
      throw new Error("category_id is required");
    }

    await validateCategoryExists(normalizedCategoryId);

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {
      category_id: normalizedCategoryId,
      $or: [{ sub_category_id: "" }, { sub_category_id: { $exists: false } }],
    };

    const [categoryDoc, products, total] = await Promise.all([
      Category.findOne({ category_id: normalizedCategoryId })
        .select("category_id name description category_image -_id")
        .lean()
        .exec(),
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean().exec(),
      Product.countDocuments(filter),
    ]);

    const category = mapPublicCategory(categoryDoc);

    return {
      products: products.map((product) => ({
        ...mapProduct(product),
        category_name: category.name,
        sub_category_name: null,
      })),
      category,
      sub_category: null,
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

  getPublicProductsBySubCategory: async (
    { category_id, sub_category_id },
    { page = 1, limit = 10 } = {}
  ) => {
    const normalizedCategoryId = toStringOrEmpty(category_id);
    const normalizedSubCategoryId = toStringOrEmpty(sub_category_id);

    if (!normalizedCategoryId) {
      throw new Error("category_id is required");
    }
    if (!normalizedSubCategoryId) {
      throw new Error("sub_category_id is required");
    }

    await validateCategoryAndSubCategory(normalizedCategoryId, normalizedSubCategoryId);

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {
      category_id: normalizedCategoryId,
      sub_category_id: normalizedSubCategoryId,
    };

    const [categoryDoc, subCategoryDoc, products, total] = await Promise.all([
      Category.findOne({ category_id: normalizedCategoryId })
        .select("category_id name description category_image -_id")
        .lean()
        .exec(),
      SubCategory.findOne({
        sub_category_id: normalizedSubCategoryId,
        category_id: normalizedCategoryId,
      })
        .select("sub_category_id category_id name description sub_category_image -_id")
        .lean()
        .exec(),
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean().exec(),
      Product.countDocuments(filter),
    ]);

    const category = mapPublicCategory(categoryDoc);
    const sub_category = mapPublicSubCategory(subCategoryDoc);

    return {
      products: products.map((product) => ({
        ...mapProduct(product),
        category_name: category.name,
        sub_category_name: sub_category.name,
      })),
      category,
      sub_category,
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

  deleteProduct: async (product_id, actor) => {
    if (!product_id) {
      throw new Error("product_id is required");
    }

    const normalizedProductId = normalizeProductId(product_id);
    const product = await Product.findOne({ product_id: normalizedProductId }).exec();

    if (!product) {
      throw new Error("Product not found");
    }

    assertCanModifyProduct(product, actor);

    await Product.deleteOne({ product_id: normalizedProductId });

    return {
      product_id: normalizedProductId,
    };
  },
};

export default ProductService;
