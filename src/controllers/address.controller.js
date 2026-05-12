import { AddressService } from "../services/address.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const AddressController = {
  setDefaultAddress: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { address_id } = req.params || {};
      const data = await AddressService.setDefaultAddress({ user_id, address_id });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Default address updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to update default address";
      if (message === "Address not found") {
        return sendError(res, 404, message);
      }
      return sendError(res, 400, message);
    }
  },

  addAddress: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const data = await AddressService.addAddress({
        user_id,
        ...(req.body || {}),
      });

      return res.status(201).json({
        success: true,
        code: 201,
        message: "Address added successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to add address";
      return sendError(res, 400, message);
    }
  },

  updateAddress: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { address_id } = req.params || {};
      const data = await AddressService.updateAddress({
        user_id,
        address_id,
        ...(req.body || {}),
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Address updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to update address";

      if (message === "Address not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  deleteAddress: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { address_id } = req.params || {};
      const data = await AddressService.deleteAddress({ user_id, address_id });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Address deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to delete address";

      if (message === "Address not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  listAddresses: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const data = await AddressService.listAddresses({ user_id });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Address list fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch addresses";
      return sendError(res, 400, message);
    }
  },
};

export default AddressController;
