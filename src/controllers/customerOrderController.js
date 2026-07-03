const CustomerOrderModel = require('../models/customerOrderModel');

exports.createOnlineOrder = async (req, res) => {
    try {
        const { items, paymentMethod, orderType, shippingAddress, voucherId } = req.body;
        const customerId = req.customerId;
        
        if (!customerId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Dữ liệu đơn hàng không hợp lệ' });
        }

        const orderId = await CustomerOrderModel.createOnlineOrder(customerId, {
            items, paymentMethod, orderType, shippingAddress, voucherId
        });

        res.status(201).json({ success: true, message: 'Đặt hàng thành công', orderId });
    } catch (err) {
        console.error('Online order error:', err);
        res.status(500).json({ success: false, message: err.message || 'Lỗi máy chủ khi đặt hàng' });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const customerId = req.customerId;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const rows = await CustomerOrderModel.getMyOrders(customerId);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.getMyOrderDetails = async (req, res) => {
    try {
        const customerId = req.customerId;
        const orderId = req.params.id;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const order = await CustomerOrderModel.getMyOrderDetails(orderId, customerId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        
        res.json({ success: true, data: order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.cancelMyOrder = async (req, res) => {
    try {
        const customerId = req.customerId;
        const orderId = req.params.id;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const status = await CustomerOrderModel.getOrderStatus(orderId, customerId);
        if (!status) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        
        if (status !== 'PENDING' && status !== 'IN_PROGRESS') {
            return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng lúc này' });
        }

        await CustomerOrderModel.updateOrderStatus(orderId, 'CANCELLED');
        res.json({ success: true, message: 'Đã hủy đơn hàng' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.completeMyOrder = async (req, res) => {
    try {
        const customerId = req.customerId;
        const orderId = req.params.id;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const status = await CustomerOrderModel.getOrderStatus(orderId, customerId);
        if (!status) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        
        if (status !== 'DELIVERING') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể xác nhận khi đơn hàng đang giao' });
        }

        await CustomerOrderModel.updateOrderStatus(orderId, 'COMPLETED');
        res.json({ success: true, message: 'Đã nhận hàng thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

