import express from "express";
import { ProductController } from "../controllers/product.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";
import { uploadProductImages } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get(
  "/public/products/category/:category_id",
  ProductController.getPublicProductsByCategory
);

router.get(
  "/public/products/category/:category_id/sub-category/:sub_category_id",
  ProductController.getPublicProductsBySubCategory
);

router.post(
  "/products",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadProductImages,
  ProductController.createProduct
);

router.put(
  "/products/:product_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadProductImages,
  ProductController.updateProduct
);

router.patch(
  "/products/:product_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadProductImages,
  ProductController.editProduct
);

router.delete(
  "/products/:product_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  ProductController.deleteProduct
);

router.get(
  "/products",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER),
  ProductController.getProducts
);

router.get(
  "/products/:product_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER),
  ProductController.getProductById
);

export default router;
