import { ProductService } from "../services/product.service.js";

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
      const body = req.body || {};
      const mainImageFile = req.files?.mainImage?.[0];
      const featuredImageFiles = req.files?.featuredImages || [];

      if (mainImageFile) {
        body.mainImage = `/uploads/products/${mainImageFile.filename}`;
      }

      if (featuredImageFiles.length > 0) {
        body.featuredImages = featuredImageFiles.map((f) => `/uploads/products/${f.filename}`);
      }

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
      const body = req.body || {};
      const mainImageFile = req.files?.mainImage?.[0];
      const featuredImageFiles = req.files?.featuredImages || [];

      if (mainImageFile) {
        body.mainImage = `/uploads/products/${mainImageFile.filename}`;
      }

      if (featuredImageFiles.length > 0) {
        body.featuredImages = featuredImageFiles.map((f) => `/uploads/products/${f.filename}`);
      }

      const data = await ProductService.updateProduct(product_id, body);

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Product update failed";

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
      const body = req.body || {};
      const mainImageFile = req.files?.mainImage?.[0];
      const featuredImageFiles = req.files?.featuredImages || [];

      if (mainImageFile) {
        body.mainImage = `/uploads/products/${mainImageFile.filename}`;
      }

      if (featuredImageFiles.length > 0) {
        body.featuredImages = featuredImageFiles.map((f) => `/uploads/products/${f.filename}`);
      }

      if (Object.keys(body).length === 0) {
        return sendError(res, 400, "At least one field is required to update");
      }

      const data = await ProductService.updateProduct(product_id, body);

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Product update failed";

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
      const { products, pagination } = await ProductService.getProducts(req.query || {});
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Products fetched successfully",
        data: products,
        pagination,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch products");
    }
  },

  getProductById: async (req, res) => {
    try {
      const { product_id } = req.params || {};
      const data = await ProductService.getProductById(product_id);
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
      const data = await ProductService.deleteProduct(product_id);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Product deletion failed";

      if (message === "Product not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  getPublicProductsByCategory: async (req, res) => {
    try {
      const { category_id } = req.params || {};
      if (!category_id) {
        return sendError(res, 400, "category_id is required");
      }

      const data = await ProductService.getPublicProductsByCategory(category_id);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category products fetched successfully",
        data,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch category products");
    }
  },

  getPublicProductsBySubCategory: async (req, res) => {
    try {
      const { sub_category_id } = req.params || {};

      if (!sub_category_id) {
        return sendError(res, 400, "sub_category_id is required");
      }

      const data = await ProductService.getPublicProductsBySubCategory(
        sub_category_id
      );

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Sub-category products fetched successfully",
        data,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch sub-category products");
    }
  },
};

export default ProductController;
