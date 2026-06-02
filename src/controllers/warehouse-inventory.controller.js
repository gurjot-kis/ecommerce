import { WarehouseInventoryService } from "../services/warehouse-inventory.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

const updateInventory = async (req, res) => {
  try {
    const { inventory_id } = req.params || {};
    const { quantity } = req.body || {};
    const data = await WarehouseInventoryService.updateInventory({ inventory_id, quantity });
    return res.status(200).json({
      success: true,
      code: 200,
      message: "Inventory updated successfully",
      data,
    });
  } catch (err) {
    const message = err?.message || "Inventory update failed";
    if (message === "Inventory not found") return sendError(res, 404, message);
    return sendError(res, 400, message);
  }
};

export const WarehouseInventoryController = {
  upsertInventory: async (req, res) => {
    try {
      const data = await WarehouseInventoryService.upsertInventory(req.body || {});
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Inventory saved successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to save inventory";
      if (message === "Warehouse not found" || message === "Product not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },

  adjustInventory: async (req, res) => {
    try {
      const data = await WarehouseInventoryService.adjustInventory(req.body || {});
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Inventory adjusted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to adjust inventory";
      if (
        message === "Warehouse not found" ||
        message === "Product not found" ||
        message === "Inventory record not found"
      ) {
        return sendError(res, 404, message);
      }
      if (message === "Insufficient warehouse stock") return sendError(res, 400, message);
      return sendError(res, 400, message);
    }
  },

  listInventory: async (req, res) => {
    try {
      const { warehouse_id, product_id, page, limit, search } = req.query || {};
      const { items, pagination } = await WarehouseInventoryService.listInventory({
        warehouse_id,
        product_id,
        page,
        limit,
        search,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Inventory fetched successfully",
        data: items,
        pagination,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch inventory");
    }
  },

  listByWarehouse: async (req, res) => {
    try {
      const { warehouse_id } = req.params || {};
      const { page, limit, search } = req.query || {};
      const { items, pagination } = await WarehouseInventoryService.listByWarehouse({
        warehouse_id,
        page,
        limit,
        search,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Warehouse inventory fetched successfully",
        data: items,
        pagination,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch warehouse inventory");
    }
  },

  getInventoryById: async (req, res) => {
    try {
      const { inventory_id } = req.params || {};
      const data = await WarehouseInventoryService.getInventoryById({ inventory_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Inventory fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch inventory";
      if (message === "Inventory not found") return sendError(res, 404, message);
      return sendError(res, 400, message);
    }
  },

  updateInventoryPut: updateInventory,
  updateInventoryPatch: updateInventory,

  deleteInventory: async (req, res) => {
    try {
      const { inventory_id } = req.params || {};
      const data = await WarehouseInventoryService.deleteInventory({ inventory_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Inventory deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Inventory deletion failed";
      if (message === "Inventory not found") return sendError(res, 404, message);
      return sendError(res, 400, message);
    }
  },
};

export default WarehouseInventoryController;
