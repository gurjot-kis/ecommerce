import { VendorDashboardService } from "../services/vendor-dashboard.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const VendorDashboardController = {
  getSummary: async (req, res) => {
    try {
      const vendor_id = req.user?.user_id;
      const { period, fromDate, toDate } = req.query || {};
      const data = await VendorDashboardService.getSummary({
        vendor_id,
        period,
        fromDate,
        toDate,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Vendor dashboard summary fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch vendor dashboard summary";
      if (message === "Invalid fromDate" || message === "Invalid toDate") {
        return sendError(res, 400, message);
      }
      return sendError(res, 500, message);
    }
  },
};

export default VendorDashboardController;
