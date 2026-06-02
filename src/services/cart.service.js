import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import {
  getActiveCartSettings,
  computeCartSummary,
} from "./cart-settings.service.js";

class InsufficientStockError extends Error {
  constructor(available, requested) {
    super(`Only ${available} unit(s) are available in stock`);
    this.availableQuantity = available;
    this.requestedQuantity = requested;
    this.name = "InsufficientStockError";
  }
}

const normalizeId = (value) => String(value || "").trim().replace(/^:/, "");

const parseQuantity = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("quantity must be an integer greater than 0");
  }
  return parsed;
};

const getProductOrThrow = async (product_id) => {
  const product = await Product.findOne({ product_id }).lean().exec();
  if (!product) {
    throw new Error("Product not found");
  }
  return product;
};

/** Max units allowed in cart for this product (integer, >= 0). */
const getAvailableStock = (product) => {
  const raw = Number(product?.stock ?? 0);
  if (!Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return Math.floor(raw);
};

/**
 * Ensures desired cart line quantity does not exceed in-stock quantity.
 * @throws Error with user-facing message when over limit or out of stock
 */
const assertQuantityWithinStock = (product, desiredQuantity) => {
  const stock = getAvailableStock(product);
  const desired = Number(desiredQuantity || 0);

  if (stock <= 0) {
    throw new Error("This product is out of stock");
  }

  if (desired > stock) {
    throw new InsufficientStockError(stock, desired);
  }
};

const mapCartItem = (item, product) => {
  const safePrice = Number(product?.price || 0);
  const safeSellingPrice = Number(product?.sellingPrice || 0);
  const safeQuantity = Number(item.quantity || 0);
  const itemTotal = safeSellingPrice * safeQuantity;
  const priceTotal = safePrice * safeQuantity;

  return {
    product_id: item.product_id,
    quantity: safeQuantity,
    product: product
      ? {
          name: product.name,
          slug: product.slug,
          mainImage: product.mainImage,
          currency: product.currency,
          price: safePrice,
          sellingPrice: safeSellingPrice,
          stock: product.stock,
          stockStatus: product.stockStatus,
        }
      : null,
    itemTotal,
    priceTotal,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const CartService = {
  addToCart: async ({ user_id, product_id, quantity }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedProductId = normalizeId(product_id);
    const addQuantity = quantity === undefined ? 1 : parseQuantity(quantity);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }

    if (!normalizedProductId) {
      throw new Error("product_id is required");
    }

    const product = await getProductOrThrow(normalizedProductId);

    const existing = await Cart.findOne({
      user_id: normalizedUserId,
      product_id: normalizedProductId,
    }).exec();

    const currentInCart = existing ? Number(existing.quantity || 0) : 0;
    const desiredTotal = currentInCart + addQuantity;
    assertQuantityWithinStock(product, desiredTotal);

    if (existing) {
      existing.quantity = desiredTotal;
      await existing.save();
      return mapCartItem(existing, product);
    }

    const cartItem = await Cart.create({
      user_id: normalizedUserId,
      product_id: normalizedProductId,
      quantity: addQuantity,
    });

    return mapCartItem(cartItem, product);
  },

  updateQuantity: async ({ user_id, product_id, quantity }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedProductId = normalizeId(product_id);
    const nextQuantity = parseQuantity(quantity);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }

    if (!normalizedProductId) {
      throw new Error("product_id is required");
    }

    const [cartItem, product] = await Promise.all([
      Cart.findOne({
        user_id: normalizedUserId,
        product_id: normalizedProductId,
      }).exec(),
      getProductOrThrow(normalizedProductId),
    ]);

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    assertQuantityWithinStock(product, nextQuantity);

    cartItem.quantity = nextQuantity;
    await cartItem.save();

    return mapCartItem(cartItem, product);
  },

  deleteCartItem: async ({ user_id, product_id }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedProductId = normalizeId(product_id);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }

    if (!normalizedProductId) {
      throw new Error("product_id is required");
    }

    const deleted = await Cart.findOneAndDelete({
      user_id: normalizedUserId,
      product_id: normalizedProductId,
    }).exec();

    if (!deleted) {
      throw new Error("Cart item not found");
    }

    return {
      product_id: normalizedProductId,
    };
  },

  listCartItems: async ({ user_id }) => {
    const normalizedUserId = normalizeId(user_id);
    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }

    const cartItems = await Cart.find({ user_id: normalizedUserId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const settings = await getActiveCartSettings();

    if (cartItems.length === 0) {
      return {
        items: [],
        totalItems: 0,
        summary: computeCartSummary([], settings),
      };
    }

    const productIds = [...new Set(cartItems.map((item) => item.product_id).filter(Boolean))];
    const products = await Product.find({ product_id: { $in: productIds } }).lean().exec();
    const productMap = new Map(products.map((product) => [product.product_id, product]));

    const items = cartItems.map((item) => mapCartItem(item, productMap.get(item.product_id)));
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const summary = computeCartSummary(items, settings);

    return {
      items,
      totalItems,
      summary,
    };
  },
};

export default CartService;
