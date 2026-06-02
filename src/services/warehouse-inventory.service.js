import Warehouse from "../models/warehouse.model.js";
import Product from "../models/product.model.js";
import WarehouseInventory from "../models/warehouse-inventory.model.js";

const normalizeString = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const normalizeId = (value) => normalizeString(value).replace(/^:/, "");

const parseQuantity = (value, { required = true } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new Error("quantity is required");
    }
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("quantity must be a non-negative integer");
  }
  return n;
};

const selectFields = "inventory_id warehouse_id product_id quantity -_id";

const mapInventory = (doc, product = null) => ({
  inventory_id: doc.inventory_id,
  warehouse_id: doc.warehouse_id,
  product_id: doc.product_id,
  quantity: Number(doc.quantity || 0),
  product: product
    ? {
        name: product.name,
        sku: product.sku,
        mainImage: product.mainImage,
        stockStatus: product.stockStatus,
      }
    : null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const ensureWarehouseExists = async (warehouse_id) => {
  const id = normalizeId(warehouse_id);
  const warehouse = await Warehouse.findOne({ warehouse_id: id }).select("warehouse_id -_id").lean().exec();
  if (!warehouse) {
    throw new Error("Warehouse not found");
  }
  return id;
};

const ensureProductExists = async (product_id) => {
  const id = normalizeId(product_id);
  const product = await Product.findOne({ product_id: id }).lean().exec();
  if (!product) {
    throw new Error("Product not found");
  }
  return product;
};

export const WarehouseInventoryService = {
  upsertInventory: async ({ warehouse_id, product_id, quantity }) => {
    const normalizedWarehouseId = await ensureWarehouseExists(warehouse_id);
    const product = await ensureProductExists(product_id);
    const normalizedProductId = product.product_id;
    const qty = parseQuantity(quantity);

    let doc = await WarehouseInventory.findOne({
      warehouse_id: normalizedWarehouseId,
      product_id: normalizedProductId,
    }).exec();

    if (doc) {
      doc.quantity = qty;
      await doc.save();
    } else {
      doc = await WarehouseInventory.create({
        warehouse_id: normalizedWarehouseId,
        product_id: normalizedProductId,
        quantity: qty,
      });
    }

    return mapInventory(doc, product);
  },

  adjustInventory: async ({ warehouse_id, product_id, quantity_delta }) => {
    const normalizedWarehouseId = await ensureWarehouseExists(warehouse_id);
    const product = await ensureProductExists(product_id);
    const normalizedProductId = product.product_id;
    const delta = Number(quantity_delta);

    if (!Number.isInteger(delta)) {
      throw new Error("quantity_delta must be an integer");
    }

    const doc = await WarehouseInventory.findOne({
      warehouse_id: normalizedWarehouseId,
      product_id: normalizedProductId,
    }).exec();

    if (!doc) {
      if (delta < 0) {
        throw new Error("Inventory record not found");
      }
      const created = await WarehouseInventory.create({
        warehouse_id: normalizedWarehouseId,
        product_id: normalizedProductId,
        quantity: delta,
      });
      return mapInventory(created, product);
    }

    const nextQty = doc.quantity + delta;
    if (nextQty < 0) {
      throw new Error("Insufficient warehouse stock");
    }

    doc.quantity = nextQty;
    await doc.save();
    return mapInventory(doc, product);
  },

  listInventory: async ({ warehouse_id, product_id, page = 1, limit = 10, search = "" } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};
    if (warehouse_id) {
      filter.warehouse_id = normalizeId(warehouse_id);
    }
    if (product_id) {
      filter.product_id = normalizeId(product_id);
    }

    const normalizedSearch = normalizeString(search);
    let productIdsFilter = null;

    if (normalizedSearch) {
      const regex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const products = await Product.find({
        $or: [{ name: regex }, { sku: regex }],
      })
        .select("product_id -_id")
        .lean()
        .exec();
      productIdsFilter = products.map((p) => p.product_id);
      if (productIdsFilter.length === 0) {
        return {
          items: [],
          pagination: {
            total: 0,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
      filter.product_id = { $in: productIdsFilter };
    }

    const [rows, total] = await Promise.all([
      WarehouseInventory.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select(selectFields)
        .lean()
        .exec(),
      WarehouseInventory.countDocuments(filter),
    ]);

    const productIds = [...new Set(rows.map((r) => r.product_id))];
    const products = productIds.length
      ? await Product.find({ product_id: { $in: productIds } })
          .select("product_id name sku mainImage stockStatus -_id")
          .lean()
          .exec()
      : [];
    const productMap = new Map(products.map((p) => [p.product_id, p]));

    return {
      items: rows.map((row) => mapInventory(row, productMap.get(row.product_id))),
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

  getInventoryById: async ({ inventory_id }) => {
    const id = normalizeId(inventory_id);
    if (!id) {
      throw new Error("inventory_id is required");
    }

    const doc = await WarehouseInventory.findOne({ inventory_id: id }).select(selectFields).lean().exec();
    if (!doc) {
      throw new Error("Inventory not found");
    }

    const product = await Product.findOne({ product_id: doc.product_id })
      .select("product_id name sku mainImage stockStatus -_id")
      .lean()
      .exec();

    return mapInventory(doc, product);
  },

  updateInventory: async ({ inventory_id, quantity }) => {
    const id = normalizeId(inventory_id);
    if (!id) {
      throw new Error("inventory_id is required");
    }

    const qty = parseQuantity(quantity);
    const doc = await WarehouseInventory.findOne({ inventory_id: id }).exec();
    if (!doc) {
      throw new Error("Inventory not found");
    }

    doc.quantity = qty;
    await doc.save();

    const product = await Product.findOne({ product_id: doc.product_id })
      .select("product_id name sku mainImage stockStatus -_id")
      .lean()
      .exec();

    return mapInventory(doc, product);
  },

  deleteInventory: async ({ inventory_id }) => {
    const id = normalizeId(inventory_id);
    if (!id) {
      throw new Error("inventory_id is required");
    }

    const result = await WarehouseInventory.deleteOne({ inventory_id: id });
    if (result.deletedCount === 0) {
      throw new Error("Inventory not found");
    }

    return { inventory_id: id };
  },

  listByWarehouse: async ({ warehouse_id, page, limit, search }) => {
    return WarehouseInventoryService.listInventory({ warehouse_id, page, limit, search });
  },
};

export default WarehouseInventoryService;
