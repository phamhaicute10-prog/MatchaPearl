const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const customerAuthController = require('../controllers/customerAuthController');
const customerOrderController = require('../controllers/customerOrderController');
const customerRewardController = require('../controllers/customerRewardController');
const customerProductController = require('../controllers/customerProductController');

router.get('/categories', customerProductController.getPublicCategories);
router.get('/products', customerProductController.getPublicProducts);
router.get('/toppings', customerProductController.getPublicToppings);

router.post('/auth/register', customerAuthController.register);
router.post('/auth/login', customerAuthController.login);
router.get('/me', customerAuthController.getMe);
router.put('/me', customerAuthController.updateMe);
router.get('/me/vouchers', customerRewardController.getMyVouchers);
router.get('/me/point-history', customerRewardController.getPointHistory);
router.get('/me/orders', customerOrderController.getMyOrders);
router.get('/me/orders/:id', customerOrderController.getMyOrderDetails);
router.put('/me/orders/:id/cancel', customerOrderController.cancelMyOrder);
router.put('/me/orders/:id/complete', customerOrderController.completeMyOrder);

router.get('/rewards', customerRewardController.getAvailableRewards);
router.post('/rewards/exchange', customerRewardController.exchangeReward);

router.post('/orders', customerOrderController.createOnlineOrder);

router.get('/', customerController.getCustomers);
router.get('/search', customerController.getCustomerByPhone);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
