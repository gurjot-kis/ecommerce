import multer from "multer";
import path from "path";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, png, webp, gif) are allowed"), false);
  }
};

const createStorage = (destinationPath) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destinationPath);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = crypto.randomUUID();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

export const uploadProductImages = multer({
  storage: createStorage("src/uploads/products"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).fields([
  { name: "mainImage", maxCount: 1 },
  { name: "featuredImages", maxCount: 10 },
]);

export const uploadCategoryImage = multer({
  storage: createStorage("src/uploads/categories"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("category_image");

export const uploadSubCategoryImage = multer({
  storage: createStorage("src/uploads/sub-categories"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("sub_category_image");

export const uploadAdminProfilePicture = multer({
  storage: createStorage("src/uploads/admin"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("profile_picture");

export const uploadBannerImage = multer({
  storage: createStorage("src/uploads/banners"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("banner_image");
