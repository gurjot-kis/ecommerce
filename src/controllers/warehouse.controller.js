import {
  WarehouseService,
  hasWarehousePayloadFields,
} from "../services/warehouse.service.js";
import { ROLES } from "../middlewares/role.middleware.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

const withImageFromUpload = (req) => {
  const payload = { ...(req.body || {}) };
  if (req.file) {
    payload.warehouse_image = `/uploads/warehouses/${req.file.filename}`;
  }
  return payload;
};

const warehouseAccessError = "Forbidden: you can only manage your own warehouses";

const applyVendorScope = (payload = {}, user = {}) => {
  if (user?.role !== ROLES.VENDOR) {
    return payload;
  }
  return {
    ...payload,
    vendor_id: user.user_id,
  };
};

const assertWarehouseAccess = (warehouse, user) => {
  if (user?.role !== ROLES.VENDOR) return;
  if (!warehouse || String(warehouse.vendor_id) !== String(user.user_id)) {
    throw new Error(warehouseAccessError);
  }
};

export const WarehouseController = {
  createWarehouse: async (req, res) => {
    try {
      const data = await WarehouseService.createWarehouse(applyVendorScope(withImageFromUpload(req), req.user));
      return res.status(201).json({
        success: true,
        code: 201,
        message: "Warehouse created successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Warehouse creation failed";
      if (message.startsWith("Forbidden:")) return sendError(res, 403, message);
      if (message === "Vendor not found") return sendError(res, 404, message);
      if (message === "Warehouse name already exists for this vendor") {
        return sendError(res, 409, message);
      }
      return sendError(res, 400, message);
    }
  },

  listWarehouses: async (req, res) => {
    try {
      const { vendor_id, page, limit, search, status } = req.query || {};
      const scopedVendorId = req.user?.role === ROLES.VENDOR ? req.user.user_id : vendor_id;
      const { items, pagination } = await WarehouseService.listWarehouses({
        vendor_id: scopedVendorId,
        page,
        limit,
        search,
        status,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Warehouses fetched successfully",
        data: items,
        pagination,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch warehouses";
      if (message === "status must be 0 or 1") return sendError(res, 400, message);
      return sendError(res, 500, "Unable to fetch warehouses");
    }
  },

  getWarehouseById: async (req, res) => {
    try {
      const { warehouse_id } = req.params || {};
      const data = await WarehouseService.getWarehouseById({ warehouse_id });
      assertWarehouseAccess(data, req.user);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Warehouse fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch warehouse";
      if (message.startsWith("Forbidden:")) return sendError(res, 403, message);
      if (message === "Warehouse not found") return sendError(res, 404, message);
      return sendError(res, 400, message);
    }
  },

  /** PUT — full update (send all main fields, same as create) */
  updateWarehousePut: async (req, res) => {
    try {
      const { warehouse_id } = req.params || {};
      const existing = await WarehouseService.getWarehouseById({ warehouse_id });
      assertWarehouseAccess(existing, req.user);
      const data = await WarehouseService.updateWarehouse({
        warehouse_id,
        ...applyVendorScope(withImageFromUpload(req), req.user),
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Warehouse updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Warehouse update failed";
      if (message.startsWith("Forbidden:")) return sendError(res, 403, message);
      if (message === "Warehouse not found" || message === "Vendor not found") {
        return sendError(res, 404, message);
      }
      if (message === "Warehouse name already exists for this vendor") {
        return sendError(res, 409, message);
      }
      return sendError(res, 400, message);
    }
  },

  /** PATCH — partial edit (send only fields to change) */
  editWarehouse: async (req, res) => {
    try {
      const { warehouse_id } = req.params || {};
      const existing = await WarehouseService.getWarehouseById({ warehouse_id });
      assertWarehouseAccess(existing, req.user);
      const payload = withImageFromUpload(req);

      if (!hasWarehousePayloadFields(payload)) {
        return sendError(res, 400, "At least one field is required to update");
      }

      const data = await WarehouseService.editWarehouse({
        warehouse_id,
        ...applyVendorScope(payload, req.user),
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Warehouse updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Warehouse update failed";
      if (message.startsWith("Forbidden:")) return sendError(res, 403, message);
      if (message === "Warehouse not found" || message === "Vendor not found") {
        return sendError(res, 404, message);
      }
      if (message === "Warehouse name already exists for this vendor") {
        return sendError(res, 409, message);
      }
      return sendError(res, 400, message);
    }
  },

  updateWarehousePatch: async (req, res) => {
    return WarehouseController.editWarehouse(req, res);
  },

  deleteWarehouse: async (req, res) => {
    try {
      const { warehouse_id } = req.params || {};
      const existing = await WarehouseService.getWarehouseById({ warehouse_id });
      assertWarehouseAccess(existing, req.user);
      const data = await WarehouseService.deleteWarehouse({ warehouse_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Warehouse deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Warehouse deletion failed";
      if (message.startsWith("Forbidden:")) return sendError(res, 403, message);
      if (message === "Warehouse not found") return sendError(res, 404, message);
      return sendError(res, 400, message);
    }
  },
};

export default WarehouseController;
