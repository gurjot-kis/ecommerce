import express from "express";
import { VendorDashboardController } from "../../controllers/vendor-dashboard.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";

const router = express.Router();

router.get(
  "/dashboard/summary",
  authMiddleware,
  authorizeRoles(ROLES.VENDOR),
  VendorDashboardController.getSummary
);

export default router;
