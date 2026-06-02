import express from "express";
import { SubCategoryController } from "../controllers/sub-category.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";
import { uploadSubCategoryImage } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post(
  "/sub-categories",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadSubCategoryImage,
  SubCategoryController.createSubCategory
);
router.get(
  "/sub-categories",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER, ROLES.VENDOR),
  SubCategoryController.getSubCategories
);
router.get(
  "/sub-categories/category/:category_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER, ROLES.VENDOR),
  SubCategoryController.getSubCategoriesByCategoryId
);
router.get(
  "/sub-categories/:sub_category_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER, ROLES.VENDOR),
  SubCategoryController.getSubCategoryById
);
router.put(
  "/sub-categories/:sub_category_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadSubCategoryImage,
  SubCategoryController.updateSubCategory
);
router.delete(
  "/sub-categories/:sub_category_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  SubCategoryController.deleteSubCategory
);

export default router;

