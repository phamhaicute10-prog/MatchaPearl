const OrderModel = require('../models/orderModel');

exports.createOrder = async (req, res) => {
    try {
        const { paymentMethod, items, voucherId, status, customerId, pointsUsed, orderType } = req.body;
        const managerId = req.userId;
        const staffId = req.staffId || req.userId;
        const orderId = await OrderModel.createOrder(managerId, staffId, paymentMethod, items, voucherId, status, customerId, pointsUsed, orderType);
        res.status(201).json({ message: 'Order created successfully', orderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.calculateOrder = async (req, res) => {
    let connection;
    try {
        const { items, voucherId } = req.body;
        connection = await require('../config/db').getConnection();
        const managerId = req.userId;
        const { finalTotalAmount, processedItems } = await OrderModel.calculateOrderData(connection, managerId, items, voucherId);
        
        let discountAmount = 0;
        let originalTotalAmount = 0;
        for (const item of processedItems) {
            originalTotalAmount += item.subTotal;
        }
        discountAmount = originalTotalAmount - finalTotalAmount;
        if (discountAmount < 0) discountAmount = 0;

        res.status(200).json({ 
            success: true, 
            finalTotalAmount, 
            originalTotalAmount, 
            discountAmount 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) connection.release();
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
