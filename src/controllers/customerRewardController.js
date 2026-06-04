const pool = require('../config/db');

exports.getAvailableRewards = async (req, res) => {
    try {
        // Lấy tất cả voucher đang hoạt động, gán mặc định 10 điểm cho mỗi voucher vì Admin POS chưa có chỗ nhập
        const [rows] = await pool.query('SELECT VoucherID, Code, Description AS Title, DiscountValue, DiscountType, NULL as ExpiryDate, 10 as PointsRequired, Status as IsActive FROM Vouchers WHERE Status = 1');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Get rewards error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.exchangeReward = async (req, res) => {
    let connection;
    try {
        const { voucherId } = req.body;
        const customerId = req.headers['customer-id'];
        
        if (!customerId || !voucherId) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Kiểm tra Voucher
        const [vRows] = await connection.query('SELECT Code, Description AS Title FROM Vouchers WHERE VoucherID = ? AND Status = 1', [voucherId]);
        if (vRows.length === 0) throw new Error('Voucher không tồn tại hoặc đã hết hạn');
        
        let pointsRequired = 10;

        // Kiểm tra Điểm Khách hàng
        const [cRows] = await connection.query('SELECT TotalPoints FROM Customers WHERE CustomerID = ?', [customerId]);
        if (cRows.length === 0 || cRows[0].TotalPoints < pointsRequired) {
            throw new Error('Bạn không đủ điểm để đổi quà này');
        }

        // Trừ điểm
        await connection.query('UPDATE Customers SET TotalPoints = TotalPoints - ? WHERE CustomerID = ?', [pointsRequired, customerId]);

        // Thêm vào Lịch sử điểm
        const titleOrCode = vRows[0].Title || vRows[0].Code;
        await connection.query(
            "INSERT INTO PointHistory (CustomerID, PointsChange, Type, Reason) VALUES (?, ?, 'Đổi quà', ?)",
            [customerId, -pointsRequired, `Đổi điểm lấy: ${titleOrCode}`]
        );

        // Thêm Voucher vào ví Khách hàng
        await connection.query(
            "INSERT INTO CustomerVouchers (CustomerID, VoucherID, Status) VALUES (?, ?, 'Chưa dùng')",
            [customerId, voucherId]
        );

        await connection.commit();
        res.json({ success: true, message: 'Đổi quà thành công!' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Exchange error:', err);
        res.status(400).json({ success: false, message: err.message || 'Lỗi hệ thống' });
    } finally {
        if (connection) connection.release();
    }
};

exports.getMyVouchers = async (req, res) => {
    try {
        const customerId = req.headers['customer-id'];
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const [rows] = await pool.query(`
            SELECT cv.CustomerVoucherID, cv.Status, cv.ReceivedDate, cv.UsedDate,
                   v.VoucherID, v.Code, v.Description AS Title, v.DiscountValue, v.DiscountType, NULL as ExpiryDate
            FROM CustomerVouchers cv
            JOIN Vouchers v ON cv.VoucherID = v.VoucherID
            WHERE cv.CustomerID = ?
            ORDER BY cv.ReceivedDate DESC
        `, [customerId]);

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.getPointHistory = async (req, res) => {
    try {
        const customerId = req.headers['customer-id'];
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const [rows] = await pool.query('SELECT * FROM PointHistory WHERE CustomerID = ? ORDER BY CreatedDate DESC', [customerId]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
