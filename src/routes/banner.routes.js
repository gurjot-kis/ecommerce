import express from "express";
import { BannerController } from "../controllers/banner.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";
import { uploadBannerImage } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/bannerimg", BannerController.getBannerImg);

router.post(
  "/banners",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadBannerImage,
  BannerController.createBanner
);

router.get(
  "/banners",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER),
  BannerController.listBanners
);

router.get(
  "/banners/:banner_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER),
  BannerController.getBannerById
);

router.put(
  "/banners/:banner_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadBannerImage,
  BannerController.updateBannerPut
);

router.patch(
  "/banners/:banner_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadBannerImage,
  BannerController.updateBannerPatch
);

router.delete(
  "/banners/:banner_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  BannerController.deleteBanner
);

export default router;
