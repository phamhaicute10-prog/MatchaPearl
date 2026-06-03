const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/', requireAuth, customerController.getCustomers);
router.get('/search', requireAuth, customerController.getCustomerByPhone);
router.post('/', requireAuth, customerController.createCustomer);

module.exports = router;
