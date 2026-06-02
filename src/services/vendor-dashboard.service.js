import Warehouse from "../models/warehouse.model.js";
import WarehouseInventory from "../models/warehouse-inventory.model.js";

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

export const VendorDashboardService = {
  getSummary: async ({ vendor_id, period, fromDate, toDate } = {}) => {
    if (!vendor_id) {
      throw new Error("vendor_id is required");
    }

    const dateFilter = resolveDateFilter({ period, fromDate, toDate });
    const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

    const warehouses = await Warehouse.find({ vendor_id: String(vendor_id).trim() })
      .select("warehouse_id")
      .lean()
      .exec();

    const warehouseIds = warehouses.map((w) => w.warehouse_id);

    const [warehousesCount, productsCount] = await Promise.all([
      Warehouse.countDocuments({ vendor_id: String(vendor_id).trim(), ...createdAtFilter }),
      warehouseIds.length
        ? WarehouseInventory.countDocuments({
            warehouse_id: { $in: warehouseIds },
            ...createdAtFilter,
          })
        : Promise.resolve(0),
    ]);

    return {
      warehousesCount,
      productsCount,
      ordersCount: 0,
      revenueTotal: 0,
      grandTotal: 0,
    };
  },
};

export default VendorDashboardService;
