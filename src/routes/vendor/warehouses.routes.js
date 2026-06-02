import express from "express";
import { WarehouseController } from "../../controllers/warehouse.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { uploadWarehouseImage } from "../../middlewares/upload.middleware.js";

const router = express.Router();

/**
 * Warehouse form-data fields (POST create, PUT update, PATCH edit):
 *   warehouse_image, vendor_id, name, code,
 *   address (Google suggestion), addressLine1,
 *   City, State, Pincode, Country,
 *   latitude, longitude, status, is_default, service_pincodes
 *
 * PUT  /warehouses/:id — full update (send main fields like create)
 * PATCH /warehouses/:id — partial edit (only changed fields)
 */

router.post(
  "/warehouses",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  uploadWarehouseImage,
  WarehouseController.createWarehouse
);

router.get(
  "/warehouses",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  WarehouseController.listWarehouses
);

router.get(
  "/warehouses/:warehouse_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  WarehouseController.getWarehouseById
);

router.put(
  "/warehouses/:warehouse_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  uploadWarehouseImage,
  WarehouseController.updateWarehousePut
);

router.patch(
  "/warehouses/:warehouse_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  uploadWarehouseImage,
  WarehouseController.updateWarehousePatch
);

router.delete(
  "/warehouses/:warehouse_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  WarehouseController.deleteWarehouse
);

export default router;
