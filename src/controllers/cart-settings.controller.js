import { CartSettingsService } from "../services/cart-settings.service.js";
import { ROLES } from "../middlewares/role.middleware.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

const updateCartSettings = async (req, res) => {
  try {
    const { cart_settings_id } = req.params || {};
    const payload = { ...(req.body || {}) };
    if (req.user?.role === ROLES.VENDOR) {
      payload.user_id = req.user.user_id;
      payload.role = ROLES.VENDOR;
    }
    const data = await CartSettingsService.updateCartSettings({
      cart_settings_id,
      ...payload,
    });
    return res.status(200).json({
      success: true,
      code: 200,
      message: "Cart settings updated successfully",
      data,
    });
  } catch (err) {
    const message = err?.message || "Cart settings update failed";
    if (message === "Cart settings not found") {
      return sendError(res, 404, message);
    }
    return sendError(res, 400, message);
  }
};

export const CartSettingsController = {
  createCartSettings: async (req, res) => {
    try {
      const payload = { ...(req.body || {}) };
      if (req.user?.role === ROLES.VENDOR) {
        payload.user_id = req.user.user_id;
        payload.role = ROLES.VENDOR;
      }
      const data = await CartSettingsService.createCartSettings(payload);
      return res.status(201).json({
        success: true,
        code: 201,
        message: "Cart settings created successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Cart settings creation failed";
      return sendError(res, 400, message);
    }
  },

  listCartSettings: async (req, res) => {
    try {
      const { page, limit } = req.query || {};
      const query = { page, limit, user_id: req.query?.user_id, role: req.query?.role };
      if (req.user?.role === ROLES.VENDOR) {
        query.user_id = req.user.user_id;
        query.role = ROLES.VENDOR;
      }
      const { items, pagination } = await CartSettingsService.listCartSettings(query);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart settings fetched successfully",
        data: items,
        pagination,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch cart settings");
    }
  },

  getCartSettingsById: async (req, res) => {
    try {
      const { cart_settings_id } = req.params || {};
      const query = { cart_settings_id, user_id: req.query?.user_id, role: req.query?.role };
      if (req.user?.role === ROLES.VENDOR) {
        query.user_id = req.user.user_id;
        query.role = ROLES.VENDOR;
      }
      const data = await CartSettingsService.getCartSettingsById(query);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart settings fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch cart settings";
      if (message === "Cart settings not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },

  updateCartSettingsPut: updateCartSettings,

  updateCartSettingsPatch: updateCartSettings,

  deleteCartSettings: async (req, res) => {
    try {
      const { cart_settings_id } = req.params || {};
      const query = { cart_settings_id, user_id: req.query?.user_id, role: req.query?.role };
      if (req.user?.role === ROLES.VENDOR) {
        query.user_id = req.user.user_id;
        query.role = ROLES.VENDOR;
      }
      const data = await CartSettingsService.deleteCartSettings(query);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart settings deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Cart settings deletion failed";
      if (message === "Cart settings not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },
};

export default CartSettingsController;
