const CustomerRewardModel = require('../models/customerRewardModel');

exports.getAvailableRewards = async (req, res) => {
    try {
        const rows = await CustomerRewardModel.getAvailableRewards();
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Get rewards error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.exchangeReward = async (req, res) => {
    try {
        const { voucherId } = req.body;
        const customerId = req.customerId;
        
        if (!customerId || !voucherId) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });

        await CustomerRewardModel.exchangeReward(customerId, voucherId);
        
        res.json({ success: true, message: 'Đổi quà thành công!' });
    } catch (err) {
        console.error('Exchange error:', err);
        res.status(400).json({ success: false, message: err.message || 'Lỗi hệ thống' });
    }
};

exports.getMyVouchers = async (req, res) => {
    try {
        const customerId = req.customerId;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const rows = await CustomerRewardModel.getMyVouchers(customerId);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.getPointHistory = async (req, res) => {
    try {
        const customerId = req.customerId;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const rows = await CustomerRewardModel.getPointHistory(customerId);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

