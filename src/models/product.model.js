import mongoose from "mongoose";
import crypto from "crypto";

const ProductSchema = new mongoose.Schema(
  {
    product_id: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },
    category_id: {
      type: String,
      required: true,
      index: true,
    },
    sub_category_id: {
      type: String,
      required: false,
      default: "",
      index: true,
    },
    mainImage: {
      type: String,
      required: true,
      trim: true,
    },
    featuredImages: {
      type: [String],
      default: [],
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      default: "pending",
      index: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    stockStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      required: true,
      default: "in_stock",
      index: true,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    role: {
      type: String,
      enum: ["SuperAdmin", "User", "Vendor"],
      index: true,
    },
    user_id: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", ProductSchema);

export default Product;
