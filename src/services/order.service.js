import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import Address from "../models/address.model.js";
import User from "../models/user.model.js";
import { sendEmail } from "../utils/email.js";
import {
  getActiveCartSettings,
  computeCartSummary,
} from "./cart-settings.service.js";

const normalizeId = (value) => String(value || "").trim().replace(/^:/, "");
const normalizeString = (value) => String(value || "").trim();

const mapShippingAddress = (shippingAddress) => {
  if (!shippingAddress) {
    return null;
  }
  return {
    address_id: shippingAddress.address_id,
    fullName: shippingAddress.fullName,
    phone: shippingAddress.phone,
    addressLine1: shippingAddress.addressLine1,
    addressLine2: shippingAddress.addressLine2 || "",
    landmark: shippingAddress.landmark || "",
    city: shippingAddress.city,
    state: shippingAddress.state,
    country: shippingAddress.country,
    pincode: shippingAddress.pincode,
    latitude:
      shippingAddress.latitude != null && Number.isFinite(shippingAddress.latitude)
        ? shippingAddress.latitude
        : null,
    longitude:
      shippingAddress.longitude != null && Number.isFinite(shippingAddress.longitude)
        ? shippingAddress.longitude
        : null,
  };
};

const mapOrderSummaryFromStored = (order) => {
  const summary = {
    items_total: Number(order.items_total || 0),
    price_total: Number(order.price_total || 0),
    discount: Number(order.discount || 0),
    grandTotal: Number(order.grandTotal || 0),
  };

  const handling = Number(order.handling_charge || 0);
  if (handling > 0) {
    summary.handling_charge = handling;
  }

  if (order.delivery_waived) {
    summary.delivery_waived = true;
  } else {
    const delivery = Number(order.delivery_charge || 0);
    if (delivery > 0) {
      summary.delivery_charge = delivery;
    }
  }

  const smallCart = Number(order.small_cart_charge || 0);
  if (smallCart > 0) {
    summary.small_cart_charge = smallCart;
  }

  return summary;
};

const hasStoredOrderPricing = (order) =>
  order.items_total != null && order.price_total != null && order.discount != null;

const buildOrderSummary = (order, settings) => {
  if (hasStoredOrderPricing(order)) {
    return mapOrderSummaryFromStored(order);
  }

  const items = order.items || [];
  if (settings) {
    return computeCartSummary(items, settings);
  }

  const items_total = items.reduce((acc, item) => acc + Number(item.itemTotal || 0), 0);
  const price_total = items.reduce(
    (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  return {
    items_total,
    price_total,
    discount: Math.max(0, price_total - items_total),
    grandTotal: Number(order.grandTotal || items_total),
  };
};

const mapOrder = (order, settings = null) => ({
  order_id: order.order_id,
  user_id: order.user_id,
  items: order.items || [],
  shippingAddress: mapShippingAddress(order.shippingAddress),
  totalItems: Number(order.totalItems || 0),
  grandTotal: Number(order.grandTotal || 0),
  summary: buildOrderSummary(order, settings),
  paymentMethod: order.paymentMethod,
  paymentReceived: Number(order.paymentReceived || 0),
  status: order.status,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const withUserName = (order, userMap, settings = null) => ({
  ...mapOrder(order, settings),
  user_name: userMap.get(order.user_id) || null,
});

const ORDER_STATUSES = ["placed", "confirmed", "shipped", "delivered", "cancelled"];
const ACTIVE_STATUSES = ["placed", "confirmed", "shipped"];

const formatOrderStatusEmail = ({ customerName, order, status }) => {
  const name = customerName || "Customer";
  const totalItems = Number(order.totalItems || 0);
  const grandTotal = Number(order.grandTotal || 0);
  const paymentMethod = order.paymentMethod || "COD";
  const paymentReceived = Number(order.paymentReceived || 0) === 1 ? "Yes" : "No";

  const subject = `Order ${order.order_id} is now ${status}`;
  const text = [
    `Hello ${name},`,
    "",
    `Your order status has been updated to: ${status}`,
    `Order ID: ${order.order_id}`,
    `Items: ${totalItems}`,
    `Grand Total: ${grandTotal}`,
    `Payment Method: ${paymentMethod}`,
    `Payment Received: ${paymentReceived}`,
    "",
    "Thank you for shopping with us.",
  ].join("\n");

  const html = `
    <p>Hello ${name},</p>
    <p>Your order status has been updated.</p>
    <p><strong>Status:</strong> ${status}</p>
    <p><strong>Order ID:</strong> ${order.order_id}</p>
    <p><strong>Items:</strong> ${totalItems}</p>
    <p><strong>Grand Total:</strong> ${grandTotal}</p>
    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
    <p><strong>Payment Received:</strong> ${paymentReceived}</p>
    <p>Thank you for shopping with us.</p>
  `;

  return { subject, text, html };
};

export const OrderService = {
  placeOrder: async ({ user_id, address_id, paymentMethod }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedAddressId = normalizeId(address_id);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }
    if (!normalizedAddressId) {
      throw new Error("address_id is required");
    }

    const [address, cartItems] = await Promise.all([
      Address.findOne({
        user_id: normalizedUserId,
        address_id: normalizedAddressId,
      })
        .lean()
        .exec(),
      Cart.find({ user_id: normalizedUserId }).lean().exec(),
    ]);

    if (!address) {
      throw new Error("Address not found");
    }

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const productIds = [...new Set(cartItems.map((item) => item.product_id).filter(Boolean))];
    const products = await Product.find({ product_id: { $in: productIds } }).lean().exec();
    const productMap = new Map(products.map((product) => [product.product_id, product]));

    const missing = productIds.filter((productId) => !productMap.has(productId));
    if (missing.length > 0) {
      throw new Error("Some cart products were not found");
    }

    // Validate sufficient stock before placing order
    for (const item of cartItems) {
      const product = productMap.get(item.product_id);
      const quantity = Number(item.quantity || 0);
      const availableStock = Number(product.stock || 0);
      if (availableStock < quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${quantity}`
        );
      }
    }

    const items = cartItems.map((item) => {
      const product = productMap.get(item.product_id);
      const quantity = Number(item.quantity || 0);
      const sellingPrice = Number(product.sellingPrice || 0);
      const price = Number(product.price || 0);

      return {
        product_id: product.product_id,
        name: product.name,
        slug: product.slug || "",
        mainImage: product.mainImage || "",
        currency: product.currency,
        price,
        sellingPrice,
        quantity,
        itemTotal: sellingPrice * quantity,
      };
    });

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    const settings = await getActiveCartSettings();
    const summary = computeCartSummary(items, settings);

    const order = await Order.create({
      user_id: normalizedUserId,
      items,
      shippingAddress: {
        address_id: address.address_id,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        landmark: address.landmark || "",
        city: address.city,
        state: address.state,
        country: address.country,
        pincode: address.pincode,
        latitude:
          address.latitude != null && Number.isFinite(address.latitude) ? address.latitude : null,
        longitude:
          address.longitude != null && Number.isFinite(address.longitude)
            ? address.longitude
            : null,
      },
      totalItems,
      grandTotal: summary.grandTotal,
      items_total: summary.items_total,
      price_total: summary.price_total,
      discount: summary.discount,
      handling_charge: summary.handling_charge || 0,
      delivery_charge: summary.delivery_charge || 0,
      delivery_waived: Boolean(summary.delivery_waived),
      small_cart_charge: summary.small_cart_charge || 0,
      paymentMethod: normalizeString(paymentMethod) || "COD",
      status: "placed",
    });

    // Decrease stock for each ordered product
    await Promise.all(
      cartItems.map(async (item) => {
        const quantity = Number(item.quantity || 0);
        const product = await Product.findOne({ product_id: item.product_id }).exec();
        if (product) {
          product.stock = Math.max(0, product.stock - quantity);
          product.stockStatus = product.stock === 0 ? "out_of_stock" : "in_stock";
          await product.save();
        }
      })
    );

    await Cart.deleteMany({ user_id: normalizedUserId }).exec();

    return mapOrder(order);
  },

  listUserOrders: async ({ user_id }) => {
    const normalizedUserId = normalizeId(user_id);
    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }

    const [orders, settings] = await Promise.all([
      Order.find({ user_id: normalizedUserId }).sort({ createdAt: -1 }).lean().exec(),
      getActiveCartSettings(),
    ]);

    return orders.map((order) => mapOrder(order, settings));
  },

  getUserOrderById: async ({ user_id, order_id }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedOrderId = normalizeId(order_id);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }
    if (!normalizedOrderId) {
      throw new Error("order_id is required");
    }

    const [order, settings] = await Promise.all([
      Order.findOne({
        user_id: normalizedUserId,
        order_id: normalizedOrderId,
      })
        .lean()
        .exec(),
      getActiveCartSettings(),
    ]);

    if (!order) {
      throw new Error("Order not found");
    }

    return mapOrder(order, settings);
  },

  cancelUserOrder: async ({ user_id, order_id }) => {
    const normalizedUserId = normalizeId(user_id);
    const normalizedOrderId = normalizeId(order_id);

    if (!normalizedUserId) {
      throw new Error("user_id is required");
    }
    if (!normalizedOrderId) {
      throw new Error("order_id is required");
    }

    const order = await Order.findOne({
      user_id: normalizedUserId,
      order_id: normalizedOrderId,
    }).exec();

    if (!order) {
      throw new Error("Order not found");
    }

    if (!ACTIVE_STATUSES.includes(order.status)) {
      throw new Error("Order cannot be cancelled");
    }

    order.status = "cancelled";
    await order.save();

    // Restore stock for each cancelled item
    await Promise.all(
      order.items.map(async (item) => {
        const product = await Product.findOne({ product_id: item.product_id }).exec();
        if (product) {
          product.stock = product.stock + Number(item.quantity || 0);
          product.stockStatus = "in_stock";
          await product.save();
        }
      })
    );

    return mapOrder(order);
  },

  listAdminOrders: async ({ status, search, page = 1, limit = 10, user_id, role }) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};
    const normalizedSearch = normalizeString(search);
    const normalizedUserId = normalizeId(user_id);
    const normalizedRole = normalizeString(role);

    if (normalizedUserId) {
      filter.user_id = normalizedUserId;
    }

    if (status) {
      const normalizedStatus = normalizeString(status).toLowerCase();
      if (!ORDER_STATUSES.includes(normalizedStatus)) {
        throw new Error("Invalid order status");
      }
      filter.status = normalizedStatus;
    }

    if (normalizedSearch) {
      const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");

      const users = await User.find({
        name: searchRegex,
        ...(normalizedRole ? { role: normalizedRole } : {}),
      })
        .select("user_id -_id")
        .lean()
        .exec();
      const userIds = users.map((user) => user.user_id);

      const searchOr = [
        { "shippingAddress.city": searchRegex },
        { "shippingAddress.state": searchRegex },
        { status: searchRegex },
      ];

      if (userIds.length > 0) {
        searchOr.push({ user_id: { $in: userIds } });
      }

      filter.$or = searchOr;
    }

    const [orders, total, settings] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean().exec(),
      Order.countDocuments(filter),
      getActiveCartSettings(),
    ]);

    const userIds = [...new Set(orders.map((order) => order.user_id).filter(Boolean))];
    const users = userIds.length
      ? await User.find({ user_id: { $in: userIds } }).select("user_id name -_id").lean().exec()
      : [];
    const userMap = new Map(users.map((user) => [user.user_id, user.name]));

    return {
      orders: orders.map((order) => withUserName(order, userMap, settings)),
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage < Math.ceil(total / parsedLimit),
        hasPrevPage: parsedPage > 1,
      },
    };
  },

  getAdminOrderById: async ({ order_id }) => {
    const normalizedOrderId = normalizeId(order_id);
    if (!normalizedOrderId) {
      throw new Error("order_id is required");
    }

    const [order, settings] = await Promise.all([
      Order.findOne({ order_id: normalizedOrderId }).lean().exec(),
      getActiveCartSettings(),
    ]);

    if (!order) {
      throw new Error("Order not found");
    }

    const user = await User.findOne({ user_id: order.user_id })
      .select("user_id name -_id")
      .lean()
      .exec();
    const userMap = new Map(user ? [[user.user_id, user.name]] : []);

    return withUserName(order, userMap, settings);
  },

  updateOrderStatus: async ({ order_id, status, paymentReceived }) => {
    const normalizedOrderId = normalizeId(order_id);
    const normalizedStatus = normalizeString(status).toLowerCase();

    if (!normalizedOrderId) {
      throw new Error("order_id is required");
    }
    if (!normalizedStatus) {
      throw new Error("status is required");
    }
    if (!ORDER_STATUSES.includes(normalizedStatus)) {
      throw new Error("Invalid order status");
    }

    const order = await Order.findOne({ order_id: normalizedOrderId }).exec();
    if (!order) {
      throw new Error("Order not found");
    }

    const previousStatus = order.status;
    order.status = normalizedStatus;

    if (paymentReceived !== undefined) {
      const normalizedPaymentReceived = Number(paymentReceived);
      if (![0, 1].includes(normalizedPaymentReceived)) {
        throw new Error("paymentReceived must be 0 or 1");
      }
      order.paymentReceived = normalizedPaymentReceived;
    }

    await order.save();

    // Restore stock when admin cancels an order
    if (normalizedStatus === "cancelled" && previousStatus !== "cancelled") {
      await Promise.all(
        order.items.map(async (item) => {
          const product = await Product.findOne({ product_id: item.product_id }).exec();
          if (product) {
            product.stock = product.stock + Number(item.quantity || 0);
            product.stockStatus = "in_stock";
            await product.save();
          }
        })
      );
    }

    // Order update should not fail if email provider is unavailable.
    try {
      const customer = await User.findOne({ user_id: order.user_id })
        .select("name email -_id")
        .lean()
        .exec();

      if (customer?.email) {
        const { subject, text, html } = formatOrderStatusEmail({
          customerName: customer.name,
          order,
          status: normalizedStatus,
        });
        await sendEmail({
          to: customer.email,
          subject,
          text,
          html,
        });
      }
    } catch (_emailErr) {}

    return mapOrder(order);
  },
};

export default OrderService;
