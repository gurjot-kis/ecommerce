import {
  ProductService,
  normalizeFeaturedImagesInput,
} from "../services/product.service.js";
import { ROLES } from "../middlewares/role.middleware.js";

const applyProductUploads = (body, files) => {
  const next = { ...(body || {}) };
  const mainImageFile = files?.mainImage?.[0];
  const featuredImageFiles = files?.featuredImages || [];

  if (mainImageFile) {
    next.mainImage = `/uploads/products/${mainImageFile.filename}`;
  }

  const uploadedFeatured = featuredImageFiles.map((f) => `/uploads/products/${f.filename}`);
  const existingFeatured = normalizeFeaturedImagesInput(next.featuredImages);

  if (uploadedFeatured.length > 0) {
    next.featuredImages = [...(existingFeatured || []), ...uploadedFeatured];
  } else if (next.featuredImages !== undefined) {
    const normalized = normalizeFeaturedImagesInput(next.featuredImages);
    if (normalized === undefined) {
      delete next.featuredImages;
    } else {
      next.featuredImages = normalized;
    }
  }

  return next;
};

const attachCreator = (body, user) => ({
  ...body,
  role: user?.role,
  user_id: user?.user_id,
});

/**
 * List products using query params from the client.
 * Frontend should pass user_id (and role) from the auth token / session.
 * Vendors may only query their own user_id.
 */
const buildProductListQuery = (query, user) => {
  const next = { ...(query || {}) };
  const queryUserId = String(next.user_id || "").trim();

  if (user?.role === ROLES.VENDOR) {
    if (!queryUserId) {
      throw new Error("user_id is required");
    }
    if (queryUserId !== String(user.user_id)) {
      throw new Error("Forbidden: user_id must match the authenticated vendor");
    }
    if (!next.role) {
      next.role = ROLES.VENDOR;
    }
    return next;
  }

  return next;
};

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

const conflictMessages = new Set([
  "Product with same SKU already exists",
  "Product with same slug already exists",
]);

export const ProductController = {
  createProduct: async (req, res) => {
    try {
      const body = attachCreator(applyProductUploads(req.body, req.files), req.user);
      const data = await ProductService.createProduct(body);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product created successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Product creation failed";

      if (
        message === "Category not found" ||
        message === "Sub-category not found in this category" ||
        message === "Sub-category not found"
      ) {
        return sendError(res, 404, message);
      }

      if (conflictMessages.has(message)) {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { product_id } = req.params || {};
      const body = applyProductUploads(req.body, req.files);
      const data = await ProductService.updateProduct(product_id, body, req.user);

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Product update failed";

      if (message.startsWith("Forbidden:")) {
        return sendError(res, 403, message);
      }

      if (
        message === "Product not found" ||
        message === "Category not found" ||
        message === "Sub-category not found in this category"
      ) {
        return sendError(res, 404, message);
      }

      if (conflictMessages.has(message)) {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  editProduct: async (req, res) => {
    try {
      const { product_id } = req.params || {};
      const body = applyProductUploads(req.body, req.files);

      if (Object.keys(body).length === 0) {
        return sendError(res, 400, "At least one field is required to update");
      }

      const data = await ProductService.updateProduct(product_id, body, req.user);

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Product update failed";

      if (message.startsWith("Forbidden:")) {
        return sendError(res, 403, message);
      }

      if (
        message === "Product not found" ||
        message === "Category not found" ||
        message === "Sub-category not found in this category"
      ) {
        return sendError(res, 404, message);
      }

      if (conflictMessages.has(message)) {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  getProducts: async (req, res) => {
    try {
      const query = buildProductListQuery(req.query, req.user);
      const { products, pagination } = await ProductService.getProducts(query);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Products fetched successfully",
        data: products,
        pagination,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch products";

      if (message.startsWith("Forbidden:")) {
        return sendError(res, 403, message);
      }

      if (message === "user_id is required") {
        return sendError(res, 400, message);
      }

      return sendError(res, 500, message);
    }
  },

  getProductById: async (req, res) => {
    try {
      const { product_id } = req.params || {};
      const data = await ProductService.getProductById(product_id);

      if (req.user?.role === ROLES.VENDOR && data.user_id !== req.user.user_id) {
        return sendError(res, 403, "Forbidden: you can only view your own products");
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch product";

      if (message === "Product not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { product_id } = req.params || {};
      const data = await ProductService.deleteProduct(product_id, req.user);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Product deletion failed";

      if (message.startsWith("Forbidden:")) {
        return sendError(res, 403, message);
      }

      if (message === "Product not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  getPublicProductsByCategory: async (req, res) => {
    try {
      const { category_id } = req.params || {};
      const { page, limit } = req.query || {};

      if (!category_id) {
        return sendError(res, 400, "category_id is required");
      }

      const { products, category, sub_category, pagination } =
        await ProductService.getPublicProductsByCategory(category_id, { page, limit });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category products fetched successfully",
        data: products,
        category,
        sub_category,
        pagination,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch category products";

      if (message === "Category not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 500, "Unable to fetch category products");
    }
  },

  getPublicProductsBySubCategory: async (req, res) => {
    try {
      const { category_id, sub_category_id } = req.params || {};
      const { page, limit } = req.query || {};

      if (!category_id) {
        return sendError(res, 400, "category_id is required");
      }

      if (!sub_category_id) {
        return sendError(res, 400, "sub_category_id is required");
      }

      const { products, category, sub_category, pagination } =
        await ProductService.getPublicProductsBySubCategory(
          { category_id, sub_category_id },
          { page, limit }
        );

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Sub-category products fetched successfully",
        data: products,
        category,
        sub_category,
        pagination,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch sub-category products";

      if (message === "Category not found" || message === "Sub-category not found in this category") {
        return sendError(res, 404, message);
      }

      return sendError(res, 500, "Unable to fetch sub-category products");
    }
  },
};

export default ProductController;
