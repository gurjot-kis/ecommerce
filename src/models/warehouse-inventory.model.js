import mongoose from "mongoose";
import crypto from "crypto";

const WarehouseInventorySchema = new mongoose.Schema(
  {
    inventory_id: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    warehouse_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    product_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

WarehouseInventorySchema.index({ warehouse_id: 1, product_id: 1 }, { unique: true });

const WarehouseInventory = mongoose.model("WarehouseInventory", WarehouseInventorySchema);

export default WarehouseInventory;
