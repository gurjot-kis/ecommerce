import { CategoryService } from "../services/category.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const CategoryController = {
  createCategory: async (req, res) => {
    try {
      const payload = { ...(req.body || {}) };
      if (req.file) {
        payload.category_image = `/uploads/categories/${req.file.filename}`;
      }

      const data = await CategoryService.createCategory(payload);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category created successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Category creation failed";

      if (message === "Category already exists") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  getCategories: async (req, res) => {
    try {
      const { page, limit, name } = req.query;
      const { categories, pagination } = await CategoryService.getCategories({ page, limit, name });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Categories fetched successfully",
        data: categories,
        pagination,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch categories");
    }
  },

  getCategoryById: async (req, res) => {
    try {
      const { category_id } = req.params || {};
      const data = await CategoryService.getCategoryById({ category_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch category";

      if (message === "Category not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { category_id } = req.params || {};
      const payload = { ...(req.body || {}) };
      if (req.file) {
        payload.category_image = `/uploads/categories/${req.file.filename}`;
      }

      const data = await CategoryService.updateCategory({ category_id, ...payload });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Category update failed";

      if (message === "Category not found") {
        return sendError(res, 404, message);
      }

      if (message === "Category name already exists") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { category_id } = req.params || {};
      const data = await CategoryService.deleteCategory({ category_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Category deletion failed";

      if (message === "Category not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },
};

export default CategoryController;

