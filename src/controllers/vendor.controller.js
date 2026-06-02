import { VendorService } from "../services/vendor.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

const updateVendor = async (req, res) => {
  try {
    const { vendor_id } = req.params || {};
    const data = await VendorService.updateVendor({ vendor_id, ...(req.body || {}) });
    return res.status(200).json({
      success: true,
      code: 200,
      message: "Vendor updated successfully",
      data,
    });
  } catch (err) {
    const message = err?.message || "Vendor update failed";
    if (message === "Vendor not found") return sendError(res, 404, message);
    if (
      message === "Vendor name already exists" ||
      message === "Vendor code already exists" ||
      message === "Email already in use"
    ) {
      return sendError(res, 409, message);
    }
    return sendError(res, 400, message);
  }
};

export const VendorController = {
  createVendor: async (req, res) => {
    try {
      const data = await VendorService.createVendor(req.body || {});
      return res.status(201).json({
        success: true,
        code: 201,
        message: "Vendor created successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Vendor creation failed";
    if (
      message === "Vendor already exists" ||
      message === "Vendor code already exists" ||
      message === "Email already in use"
    ) {
      return sendError(res, 409, message);
    }
    return sendError(res, 400, message);
  }
},

  listVendors: async (req, res) => {
    try {
      const { page, limit, search, status } = req.query || {};
      const { items, pagination } = await VendorService.listVendors({ page, limit, search, status });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Vendors fetched successfully",
        data: items,
        pagination,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch vendors";
      if (message === "status must be 0 or 1") return sendError(res, 400, message);
      return sendError(res, 500, "Unable to fetch vendors");
    }
  },

  getVendorById: async (req, res) => {
    try {
      const { vendor_id } = req.params || {};
      const data = await VendorService.getVendorById({ vendor_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Vendor fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch vendor";
      if (message === "Vendor not found") return sendError(res, 404, message);
      return sendError(res, 400, message);
    }
  },

  updateVendorPut: updateVendor,
  updateVendorPatch: updateVendor,

  deleteVendor: async (req, res) => {
    try {
      const { vendor_id } = req.params || {};
      const data = await VendorService.deleteVendor({ vendor_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Vendor deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Vendor deletion failed";
      if (message === "Vendor not found") return sendError(res, 404, message);
      return sendError(res, 400, message);
    }
  },
};

export default VendorController;
