import mongoose from "mongoose";
import crypto from "crypto";

const WarehouseSchema = new mongoose.Schema(
  {
    warehouse_id: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    vendor_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      default: "",
      trim: true,
    },
    warehouse_image: {
      type: String,
      default: "",
      trim: true,
    },
    full_address: {
      type: String,
      default: "",
      trim: true,
    },
    addressLine1: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
    },
    pincode: {
      type: String,
      default: "",
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    service_pincodes: {
      type: [String],
      default: [],
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

WarehouseSchema.index({ vendor_id: 1, name: 1 }, { unique: true });

const Warehouse = mongoose.model("Warehouse", WarehouseSchema);

export default Warehouse;
