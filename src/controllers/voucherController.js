const pool = require('../config/db');

exports.getAllVouchers = async (req, res) => {
    try {
        if (!req.userId) return res.status(400).json({ message: 'Thiếu ID người dùng' });
        
        const [rows] = await pool.query('SELECT * FROM Vouchers WHERE UserID = ? ORDER BY CreatedAt DESC', [req.userId]);
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

        const query = `
            INSERT INTO Vouchers (Code, Description, DiscountType, DiscountValue, BuyQuantity, GetQuantity, TargetCategoryID, Status, UserID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status ?? 1, req.userId];
        
        const [result] = await pool.query(query, params);
        res.status(201).json({ message: 'Thêm mã giảm giá thành công', voucherId: result.insertId });
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
        
        const query = `
            UPDATE Vouchers 
            SET Code = ?, Description = ?, DiscountType = ?, DiscountValue = ?, BuyQuantity = ?, GetQuantity = ?, TargetCategoryID = ?, Status = ?
            WHERE VoucherID = ? AND UserID = ?
        `;
        const params = [code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status, voucherId, req.userId];
        
        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
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
        
        const [result] = await pool.query('DELETE FROM Vouchers WHERE VoucherID = ? AND UserID = ?', [voucherId, req.userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc bạn không có quyền' });
        }
        res.json({ message: 'Xóa mã giảm giá thành công' });
    } catch (err) {
        console.error('Lỗi khi xóa mã giảm giá:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};
