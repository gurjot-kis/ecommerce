import { OrderService } from "../services/order.service.js";
import { ROLES } from "../middlewares/role.middleware.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const OrderController = {
  placeOrder: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { address_id, paymentMethod } = req.body || {};
      const data = await OrderService.placeOrder({ user_id, address_id, paymentMethod });
      return res.status(201).json({
        success: true,
        code: 201,
        message: "Order placed successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to place order";
      if (message === "Address not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },

  listUserOrders: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const data = await OrderService.listUserOrders({ user_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Orders fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch orders";
      return sendError(res, 400, message);
    }
  },

  getUserOrderById: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { order_id } = req.params || {};
      const data = await OrderService.getUserOrderById({ user_id, order_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Order fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch order";
      if (message === "Order not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },

  cancelUserOrder: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { order_id } = req.params || {};
      const data = await OrderService.cancelUserOrder({ user_id, order_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Order cancelled successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to cancel order";
      if (message === "Order not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },

  listAdminOrders: async (req, res) => {
    try {
      const { status, search, page, limit } = req.query || {};
      const query = { status, search, page, limit, user_id: req.query?.user_id, role: req.query?.role };
      if (req.user?.role === ROLES.VENDOR) {
        query.user_id = req.user.user_id;
        query.role = ROLES.VENDOR;
      }
      const { orders, pagination } = await OrderService.listAdminOrders({
        ...query,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Orders fetched successfully",
        data: orders,
        pagination,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch orders";
      return sendError(res, 400, message);
    }
  },

  getAdminOrderById: async (req, res) => {
    try {
      const { order_id } = req.params || {};
      const data = await OrderService.getAdminOrderById({ order_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Order fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch order";
      if (message === "Order not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const { order_id } = req.params || {};
      const { status, paymentReceived } = req.body || {};
      const data = await OrderService.updateOrderStatus({
        order_id,
        status,
        paymentReceived,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Order status updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to update order status";
      if (message === "Order not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },
};

export default OrderController;
