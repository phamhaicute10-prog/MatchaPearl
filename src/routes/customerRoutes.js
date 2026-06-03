const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const customerAuthController = require('../controllers/customerAuthController');
const customerOrderController = require('../controllers/customerOrderController');
const customerRewardController = require('../controllers/customerRewardController');

router.post('/auth/register', customerAuthController.register);
router.post('/auth/login', customerAuthController.login);
router.get('/me', customerAuthController.getMe);
router.get('/me/vouchers', customerRewardController.getMyVouchers);
router.get('/me/point-history', customerRewardController.getPointHistory);
router.get('/me/orders', customerOrderController.getMyOrders);

router.get('/rewards', customerRewardController.getAvailableRewards);
router.post('/rewards/exchange', customerRewardController.exchangeReward);

router.post('/orders', customerOrderController.createOnlineOrder);

router.get('/', customerController.getCustomers);
router.get('/search', customerController.getCustomerByPhone);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);

module.exports = router;
