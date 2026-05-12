import { DashboardService } from "../services/dashboard.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const DashboardController = {
  getCounts: async (_req, res) => {
    try {
      const data = await DashboardService.getCounts();
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Dashboard counts fetched successfully",
        data,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch dashboard counts");
    }
  },

  getSummary: async (req, res) => {
    try {
      const { period, fromDate, toDate } = req.query || {};
      const data = await DashboardService.getSummary({ period, fromDate, toDate });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Dashboard summary fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch dashboard summary";
      return sendError(res, 400, message);
    }
  },

  getOrderStats: async (_req, res) => {
    try {
      const data = await DashboardService.getOrderStats();
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Order stats fetched successfully",
        data,
      });
    } catch (_err) {
      return sendError(res, 500, "Unable to fetch order stats");
    }
  },
};

export default DashboardController;
