import mongoose from "mongoose";

const CartSchema = new mongoose.Schema(
  {
    user_id: {
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
      min: 1,
      default: 1,
    },
  },
  { timestamps: true }
);

CartSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

const Cart = mongoose.model("Cart", CartSchema);

export default Cart;
