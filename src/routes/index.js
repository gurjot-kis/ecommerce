import express from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import subCategoryRoutes from './sub-category.routes.js';
import productRoutes from './product.routes.js';
import userRoutes from './user.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import adminRoutes from './admin.routes.js';
import cartRoutes from './cart.routes.js';
import addressRoutes from './address.routes.js';
import orderRoutes from './order.routes.js';
import bannerRoutes from './banner.routes.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello World');
});

// POST /api/signup
// POST /api/login
router.use(authRoutes);
router.use(categoryRoutes);
router.use(subCategoryRoutes);
router.use(productRoutes);
router.use(userRoutes);
router.use(dashboardRoutes);
router.use(adminRoutes);
router.use(cartRoutes);
router.use(addressRoutes);
router.use(orderRoutes);
router.use(bannerRoutes);

export default router;