import express from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.get(
  "/dashboard/counts",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  DashboardController.getCounts
);

router.get(
  "/dashboard/summary",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  DashboardController.getSummary
);

router.get(
  "/dashboard/order-stats",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  DashboardController.getOrderStats
);

export default router;
