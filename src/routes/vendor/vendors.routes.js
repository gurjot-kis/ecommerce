import express from "express";
import { VendorController } from "../../controllers/vendor.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";

const router = express.Router();

/**
 * Vendor APIs (stored in users table, role: "Vendor")
 * Base URL: /api/vendor
 * Auth: Bearer <SuperAdmin JWT> required for GET list/detail and DELETE only
 *
 * POST   /api/vendor/vendors  (no auth)
 * Body:  { "name": "Acme Supplies", "email": "vendor@example.com", "code": "V001",
 *           "phone": "9876543210", "address": "123 Main St", "gst_number": "29ABCDE1234F1Z5",
 *           "password": "Secret@123", "status": 1 }
 * Required on create: name, email
 *
 * GET    /api/vendor/vendors?page=1&limit=10&search=acme&status=1
 *
 * GET    /api/vendor/vendors/:vendor_id
 *
 * PUT    /api/vendor/vendors/:vendor_id  (no auth)
 * PATCH  /api/vendor/vendors/:vendor_id  (no auth, edit vendor)
 * Body:  { "name": "Acme Supplies Ltd", "email": "vendor@example.com", "code": "V001",
 *           "phone": "9876543210", "address": "456 New St", "gst_number": "29ABCDE1234F1Z5",
 *           "password": "NewSecret@123", "status": 1 }
 * PATCH/PUT: send only fields to change (at least one required)
 *
 * DELETE /api/vendor/vendors/:vendor_id
 *
 * Response data shape:
 * { "vendor_id": "<user_id>", "name", "code", "email", "phone", "address",
 *   "gst_number", "status": 0|1, "createdAt", "updatedAt" }
 * Note: vendor_id in URL/response is the user's user_id.
 */

router.post("/vendors", VendorController.createVendor);

router.get(
  "/vendors",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  VendorController.listVendors
);

const authorizeVendorSelfOrAdmin = (req, res, next) => {
  const userRole = req.user?.role;
  const vendorId = String(req.params?.vendor_id || "").trim();

  if (userRole === ROLES.SUPER_ADMIN) {
    return next();
  }

  if (userRole === ROLES.VENDOR && vendorId && vendorId === req.user?.user_id) {
    return next();
  }

  return res.status(403).json({
    success: false,
    code: 403,
    message: "Forbidden: insufficient role",
    data: null,
  });
};

router.get(
  "/vendors/:vendor_id",
  authMiddleware,
  authorizeVendorSelfOrAdmin,
  VendorController.getVendorById
);

router.put("/vendors/:vendor_id", VendorController.updateVendorPut);
router.patch("/vendors/:vendor_id", VendorController.updateVendorPatch);

router.delete(
  "/vendors/:vendor_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  VendorController.deleteVendor
);

export default router;
