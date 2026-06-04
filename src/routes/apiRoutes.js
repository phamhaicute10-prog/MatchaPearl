const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const paymentController = require('../controllers/paymentController');
const dashboardController = require('../controllers/dashboardController');
const voucherController = require('../controllers/voucherController');
const inventoryController = require('../controllers/inventoryController');
const staffController = require('../controllers/staffController');
const customerRoutes = require('./customerRoutes');
const newsRoutes = require('./newsRoutes');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Auth Routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.put('/update-profile', upload.single('avatar'), authController.updateProfile);
router.put('/change-password', authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);

// Product Routes
router.get('/categories', productController.getCategories);
router.get('/products', productController.getProducts);
router.post('/products', upload.single('image'), productController.addProduct);
router.post('/products/update/:id', upload.single('image'), productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
router.get('/toppings', productController.getToppings);
router.post('/toppings', upload.single('image'), productController.addTopping);
router.post('/toppings/update/:id', upload.single('image'), productController.updateTopping);
router.delete('/toppings/:id', productController.deleteTopping);

// Order Routes
router.post('/orders/calculate', orderController.calculateOrder);
router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getOrders);
router.get('/orders/:id', orderController.getOrderDetails);
router.put('/orders/:id/status', orderController.updateOrderStatus);
router.put('/orders/:id/cancel', orderController.cancelOrder);

// Voucher Routes
router.get('/vouchers', voucherController.getAllVouchers);
router.post('/vouchers', voucherController.createVoucher);
router.put('/vouchers/:id', voucherController.updateVoucher);
router.delete('/vouchers/:id', voucherController.deleteVoucher);

// Payment Routes
router.post('/payment/create-payos-link', paymentController.createPaymentLink);
router.get('/payment/status/:orderCode', paymentController.checkPaymentStatus);

// Dashboard/Reports
router.get('/reports/dashboard', dashboardController.getDashboardData);
router.get('/reports/overview', dashboardController.getOverviewData);



// Inventory Routes
router.get('/inventory/ingredients', inventoryController.getIngredients);
router.post('/inventory/ingredients', inventoryController.addIngredient);
router.put('/inventory/ingredients/:id', inventoryController.updateIngredient);
router.delete('/inventory/ingredients/:id', inventoryController.deleteIngredient);
router.post('/inventory/ingredients/:id/import', inventoryController.importStock);
router.get('/inventory/recipes/:productId', inventoryController.getRecipes);
router.post('/inventory/recipes/:productId', inventoryController.addRecipe);
router.delete('/inventory/recipes/:recipeId', inventoryController.deleteRecipe);

// Staff Routes
router.get('/staffs', staffController.getStaffs);
router.post('/staffs', staffController.addStaff);
router.put('/staffs/:id', staffController.updateStaff);
router.delete('/staffs/:id', staffController.deleteStaff);
// Customer Routes
router.use('/customers', customerRoutes);
router.use('/news', newsRoutes);

module.exports = router;
