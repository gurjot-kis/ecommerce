import express from "express";
import { WarehouseInventoryController } from "../../controllers/warehouse-inventory.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";

const router = express.Router();

router.post(
  "/inventory",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  WarehouseInventoryController.upsertInventory
);

router.post(
  "/inventory/adjust",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  WarehouseInventoryController.adjustInventory
);

router.get(
  "/inventory",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  WarehouseInventoryController.listInventory
);

router.get(
  "/warehouses/:warehouse_id/inventory",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  WarehouseInventoryController.listByWarehouse
);

router.get(
  "/inventory/:inventory_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  WarehouseInventoryController.getInventoryById
);

router.put(
  "/inventory/:inventory_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  WarehouseInventoryController.updateInventoryPut
);

router.patch(
  "/inventory/:inventory_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  WarehouseInventoryController.updateInventoryPatch
);

router.delete(
  "/inventory/:inventory_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  WarehouseInventoryController.deleteInventory
);

export default router;
