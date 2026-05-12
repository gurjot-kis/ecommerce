import { SubCategoryService } from "../services/sub-category.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const SubCategoryController = {
  createSubCategory: async (req, res) => {
    try {
      const payload = { ...(req.body || {}) };
      if (req.file) {
        payload.sub_category_image = `/uploads/sub-categories/${req.file.filename}`;
      }

      const data = await SubCategoryService.createSubCategory(payload);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Sub-category created successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Sub-category creation failed";

      if (message === "Category not found") {
        return sendError(res, 404, message);
      }

      if (message === "Sub-category already exists in this category") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  getSubCategories: async (req, res) => {
    try {
      const { page, limit } = req.query;
      const { subCategories, pagination } = await SubCategoryService.getSubCategories({ page, limit });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Sub-categories fetched successfully",
        data: subCategories,
        pagination,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch sub-categories");
    }
  },

  getSubCategoriesByCategoryId: async (req, res) => {
    try {
      const { category_id } = req.params || {};

      if (!category_id) {
        return sendError(res, 400, "category_id is required");
      }

      const { page, limit } = req.query;
      const { subCategories, pagination } = await SubCategoryService.getSubCategories({ category_id, page, limit });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Sub-categories fetched successfully",
        data: subCategories,
        pagination,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch sub-categories");
    }
  },

  getSubCategoryById: async (req, res) => {
    try {
      const { sub_category_id } = req.params || {};
      const data = await SubCategoryService.getSubCategoryById({ sub_category_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Sub-category fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch sub-category";

      if (message === "Sub-category not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  updateSubCategory: async (req, res) => {
    try {
      const { sub_category_id } = req.params || {};
      const payload = { ...(req.body || {}) };
      if (req.file) {
        payload.sub_category_image = `/uploads/sub-categories/${req.file.filename}`;
      }

      const data = await SubCategoryService.updateSubCategory({ sub_category_id, ...payload });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Sub-category updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Sub-category update failed";

      if (message === "Sub-category not found") {
        return sendError(res, 404, message);
      }

      if (message === "Sub-category name already exists in this category") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  deleteSubCategory: async (req, res) => {
    try {
      const { sub_category_id } = req.params || {};
      const data = await SubCategoryService.deleteSubCategory({ sub_category_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Sub-category deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Sub-category deletion failed";

      if (message === "Sub-category not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },
};

export default SubCategoryController;

