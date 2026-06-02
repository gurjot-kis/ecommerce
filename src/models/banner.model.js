import mongoose from "mongoose";
import crypto from "crypto";

const BannerSchema = new mongoose.Schema(
  {
    banner_id: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    banner_image: {
      type: String,
      default: "",
      trim: true,
    },
    order_url: {
      type: String,
      required: true,
      trim: true,
    },
    upload_area: {
      type: String,
      enum: ["website", "app"],
      default: "website",
      trim: true,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
  },
  { timestamps: true }
);

const Banner = mongoose.model("Banner", BannerSchema);

export default Banner;
