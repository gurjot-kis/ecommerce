import express from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";
import { uploadAdminProfilePicture } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get(
  "/admin/profile",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  AdminController.getProfile
);

router.patch(
  "/admin/profile",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadAdminProfilePicture,
  AdminController.updateProfile
);

export default router;
