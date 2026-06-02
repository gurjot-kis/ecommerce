import { CartService } from "../services/cart.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const CartController = {
  addToCart: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { product_id, quantity } = req.body || {};

      const data = await CartService.addToCart({ user_id, product_id, quantity });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product added to cart successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to add product to cart";

      if (message === "Product not found") {
        return sendError(res, 404, message);
      }

      if (err?.name === "InsufficientStockError") {
        return res.status(400).json({
          success: false,
          code: 400,
          message: err.message,
          data: {
            available_quantity: err.availableQuantity,
            requested_quantity: err.requestedQuantity,
          },
        });
      }

      return sendError(res, 400, message);
    }
  },

  updateQuantity: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { product_id } = req.params || {};
      const { quantity } = req.body || {};

      const data = await CartService.updateQuantity({ user_id, product_id, quantity });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart quantity updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to update cart quantity";

      if (message === "Product not found" || message === "Cart item not found") {
        return sendError(res, 404, message);
      }

      if (err?.name === "InsufficientStockError") {
        return res.status(400).json({
          success: false,
          code: 400,
          message: err.message,
          data: {
            available_quantity: err.availableQuantity,
            requested_quantity: err.requestedQuantity,
          },
        });
      }

      return sendError(res, 400, message);
    }
  },

  deleteCartItem: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { product_id } = req.params || {};

      const data = await CartService.deleteCartItem({ user_id, product_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart item deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to delete cart item";

      if (message === "Cart item not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  listCartItems: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const data = await CartService.listCartItems({ user_id });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart list fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch cart list";
      return sendError(res, 400, message);
    }
  },
};

export default CartController;
