import express from "express";
import vendorsRoutes from "./vendors.routes.js";
import warehousesRoutes from "./warehouses.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = express.Router();

router.use(vendorsRoutes);
router.use(warehousesRoutes);
router.use(inventoryRoutes);
router.use(dashboardRoutes);

export default router;
