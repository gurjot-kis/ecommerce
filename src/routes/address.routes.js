import express from "express";
import { AddressController } from "../controllers/address.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.patch(
  "/address/:address_id/default",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  AddressController.setDefaultAddress
);

router.post(
  "/address",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  AddressController.addAddress
);

router.put(
  "/address/:address_id",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  AddressController.updateAddress
);

router.delete(
  "/address/:address_id",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  AddressController.deleteAddress
);

router.get(
  "/address/list",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  AddressController.listAddresses
);

router.get(
  "/address",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  AddressController.listAddresses
);

export default router;
