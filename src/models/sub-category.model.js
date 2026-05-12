import mongoose from "mongoose";
import crypto from "crypto";

const SubCategorySchema = new mongoose.Schema(
  {
    sub_category_id: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    category_id: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    sub_category_image: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

SubCategorySchema.index({ category_id: 1, name: 1 }, { unique: true });

const SubCategory = mongoose.model("SubCategory", SubCategorySchema);

export default SubCategory;

