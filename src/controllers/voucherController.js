const VoucherModel = require('../models/voucherModel');

exports.getAllVouchers = async (req, res) => {
    try {
        if (!req.userId) return res.status(400).json({ message: 'Thiếu ID người dùng' });
        
        const rows = await VoucherModel.getAllVouchers(req.userId);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi khi lấy mã giảm giá:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.createVoucher = async (req, res) => {
    try {
        if (!req.userId) return res.status(400).json({ message: 'Thiếu ID người dùng' });
        const { code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status } = req.body;
        
        if (!code || !discountType) {
            return res.status(400).json({ message: 'Mã và Loại giảm giá là bắt buộc' });
        }

        const voucherId = await VoucherModel.createVoucher({
            code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status, userId: req.userId
        });

        res.status(201).json({ message: 'Thêm mã giảm giá thành công', voucherId });
    } catch (err) {
        console.error('Lỗi khi thêm mã giảm giá:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Mã giảm giá này đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.updateVoucher = async (req, res) => {
    try {
        if (!req.userId) return res.status(400).json({ message: 'Thiếu ID người dùng' });
        const voucherId = req.params.id;
        const { code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status } = req.body;
        
        const affectedRows = await VoucherModel.updateVoucher(voucherId, req.userId, {
            code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status
        });

        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc bạn không có quyền' });
        }
        res.json({ message: 'Cập nhật mã giảm giá thành công' });
    } catch (err) {
        console.error('Lỗi khi cập nhật mã giảm giá:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.deleteVoucher = async (req, res) => {
    try {
        if (!req.userId) return res.status(400).json({ message: 'Thiếu ID người dùng' });
        const voucherId = req.params.id;
        
        const affectedRows = await VoucherModel.deleteVoucher(voucherId, req.userId);
        
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc bạn không có quyền' });
        }
        res.json({ message: 'Xóa mã giảm giá thành công' });
    } catch (err) {
        console.error('Lỗi khi xóa mã giảm giá:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};
