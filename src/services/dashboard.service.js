import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";

// Build a { $gte, $lte } date filter based on period or custom range
const resolveDateFilter = ({ period, fromDate, toDate }) => {
  const now = new Date();

  if (fromDate || toDate) {
    const filter = {};
    if (fromDate) {
      const from = new Date(fromDate);
      if (isNaN(from.getTime())) throw new Error("Invalid fromDate");
      from.setHours(0, 0, 0, 0);
      filter.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      if (isNaN(to.getTime())) throw new Error("Invalid toDate");
      to.setHours(23, 59, 59, 999);
      filter.$lte = to;
    }
    return filter;
  }

  if (period === "this_month") {
    return {
      $gte: new Date(now.getFullYear(), now.getMonth(), 1),
      $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }

  if (period === "last_month") {
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { $gte: firstDayLastMonth, $lte: lastDayLastMonth };
  }

  return null;
};

export const DashboardService = {
  getCounts: async () => {
    const [usersCount, categoriesCount, productsCount] = await Promise.all([
      User.countDocuments({ role: "User" }),
      Category.countDocuments({}),
      Product.countDocuments({}),
    ]);

    return {
      usersCount,
      categoriesCount,
      productsCount,
    };
  },

  getSummary: async ({ period, fromDate, toDate } = {}) => {
    const dateFilter = resolveDateFilter({ period, fromDate, toDate });
    const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

    const [
      usersCount,
      productsCount,
      ordersCount,
      grandTotalResult,
    ] = await Promise.all([
      User.countDocuments({ role: "User", ...createdAtFilter }),
      Product.countDocuments({ ...createdAtFilter }),
      Order.countDocuments({ status: { $ne: "cancelled" }, ...createdAtFilter }),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" }, ...createdAtFilter } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
    ]);

    const grandTotal = grandTotalResult?.[0]?.total || 0;

    const filterLabel = period || (fromDate || toDate ? "custom" : "all_time");

    return {
      filter: filterLabel,
      ...(dateFilter?.["$gte"] && { fromDate: dateFilter["$gte"] }),
      ...(dateFilter?.["$lte"] && { toDate: dateFilter["$lte"] }),
      usersCount,
      productsCount,
      ordersCount,
      grandTotal,
    };
  },

  getOrderStats: async () => {
    const [
      totalOrders,
      paymentReceivedCount,
      paymentPendingCount,
      placedCount,
      confirmedCount,
      shippedCount,
      deliveredCount,
      cancelledCount,
      grandTotalResult,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ paymentReceived: 1 }),
      Order.countDocuments({ paymentReceived: 0 }),
      Order.countDocuments({ status: "placed" }),
      Order.countDocuments({ status: "confirmed" }),
      Order.countDocuments({ status: "shipped" }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: "$status", total: { $sum: "$grandTotal" } } },
      ]),
    ]);

    const grandTotalMap = {};
    for (const entry of grandTotalResult || []) {
      grandTotalMap[entry._id] = entry.total;
    }

    return {
      totalOrders,
      grandTotal: {
        placed: grandTotalMap["placed"] || 0,
        confirmed: grandTotalMap["confirmed"] || 0,
        shipped: grandTotalMap["shipped"] || 0,
        delivered: grandTotalMap["delivered"] || 0,
      },
      payment: {
        received: paymentReceivedCount,
        pending: paymentPendingCount,
      },
      ordersByStatus: {
        placed: placedCount,
        confirmed: confirmedCount,
        shipped: shippedCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
      },
    };
  },
};

export default DashboardService;
