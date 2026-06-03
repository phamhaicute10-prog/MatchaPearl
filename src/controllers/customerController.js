const CustomerModel = require('../models/customerModel');

exports.getCustomers = async (req, res) => {
    try {
        const customers = await CustomerModel.getCustomers(req.userId);
        res.status(200).json({ success: true, customers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getCustomerByPhone = async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone is required' });
        }
        const customer = await CustomerModel.getCustomerByPhone(req.userId, phone);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.status(200).json({ success: true, customer });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const { fullName, phone } = req.body;
        if (!fullName || !phone) {
            return res.status(400).json({ success: false, message: 'FullName and Phone are required' });
        }
        // Check if phone already exists
        const existing = await CustomerModel.getCustomerByPhone(req.userId, phone);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }
        
        const customerId = await CustomerModel.createCustomer(req.userId, fullName, phone);
        res.status(201).json({ success: true, message: 'Customer created', customerId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, phone } = req.body;
        
        if (!fullName || !phone) {
            return res.status(400).json({ success: false, message: 'FullName and Phone are required' });
        }
        
        // Check if new phone already exists for a DIFFERENT customer
        const existing = await CustomerModel.getCustomerByPhone(req.userId, phone);
        if (existing && existing.CustomerID.toString() !== id) {
            return res.status(400).json({ success: false, message: 'Phone number already registered by another customer' });
        }
        
        const success = await CustomerModel.updateCustomer(req.userId, id, fullName, phone);
        if (success) {
            res.json({ success: true, message: 'Customer updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Customer not found or no changes made' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
