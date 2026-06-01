const OrderModel = require('../models/orderModel');

exports.createOrder = async (req, res) => {
    try {
        const { totalAmount, paymentMethod, items, status } = req.body;
        // Override body userId with the authenticated req.userId for security
        const orderId = await OrderModel.createOrder(req.userId, totalAmount, paymentMethod, items, status);
        res.status(201).json({ message: 'Order created successfully', orderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const filters = {
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            search: req.query.search
        };
        const result = await OrderModel.getOrders(filters, req.userId);
        res.status(200).json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getOrderDetails = async (req, res) => {
    try {
        const order = await OrderModel.getOrderDetails(req.params.id, req.userId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.status(200).json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const success = await OrderModel.updateOrderStatus(req.params.id, status, req.userId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Order not found or cannot be updated' });
        }
        res.status(200).json({ success: true, message: 'Order status updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const success = await OrderModel.cancelOrder(req.params.id, req.userId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Order not found or cannot be cancelled' });
        }
        res.status(200).json({ success: true, message: 'Order cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
