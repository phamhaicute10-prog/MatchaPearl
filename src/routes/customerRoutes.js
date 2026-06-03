const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', customerController.getCustomers);
router.get('/search', customerController.getCustomerByPhone);
router.post('/', customerController.createCustomer);

module.exports = router;
