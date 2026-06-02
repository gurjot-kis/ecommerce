import express from "express";
import { CartSettingsController } from "../controllers/cart-settings.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post(
  "/admin/cart-settings",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  CartSettingsController.createCartSettings
);

router.get(
  "/admin/cart-settings",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  CartSettingsController.listCartSettings
);

router.get(
  "/admin/cart-settings/:cart_settings_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  CartSettingsController.getCartSettingsById
);

router.put(
  "/admin/cart-settings/:cart_settings_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  CartSettingsController.updateCartSettingsPut
);

router.patch(
  "/admin/cart-settings/:cart_settings_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  CartSettingsController.updateCartSettingsPatch
);

router.delete(
  "/admin/cart-settings/:cart_settings_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  CartSettingsController.deleteCartSettings
);

export default router;
