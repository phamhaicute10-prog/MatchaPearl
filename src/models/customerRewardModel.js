const pool = require('../config/db');

class CustomerRewardModel {
    static async getAvailableRewards() {
        const [rows] = await pool.query('SELECT VoucherID, Code, Description AS Title, DiscountValue, DiscountType, NULL as ExpiryDate, 10 as PointsRequired, Status as IsActive FROM Vouchers WHERE Status = 1');
        return rows;
    }

    static async exchangeReward(customerId, voucherId) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [vRows] = await connection.query('SELECT Code, Description AS Title FROM Vouchers WHERE VoucherID = ? AND Status = 1', [voucherId]);
            if (vRows.length === 0) throw new Error('Voucher không tồn tại hoặc đã hết hạn');
            
            let pointsRequired = 10;

            const [cRows] = await connection.query('SELECT TotalPoints FROM Customers WHERE CustomerID = ?', [customerId]);
            if (cRows.length === 0 || cRows[0].TotalPoints < pointsRequired) {
                throw new Error('Bạn không đủ điểm để đổi quà này');
            }

            await connection.query('UPDATE Customers SET TotalPoints = TotalPoints - ? WHERE CustomerID = ?', [pointsRequired, customerId]);

            const titleOrCode = vRows[0].Title || vRows[0].Code;
            await connection.query(
                "INSERT INTO PointHistory (CustomerID, PointsChange, Type, Reason) VALUES (?, ?, 'Đổi quà', ?)",
                [customerId, -pointsRequired, `Đổi điểm lấy: ${titleOrCode}`]
            );

            await connection.query(
                "INSERT INTO CustomerVouchers (CustomerID, VoucherID, Status) VALUES (?, ?, 'Chưa dùng')",
                [customerId, voucherId]
            );

            await connection.commit();
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    static async getMyVouchers(customerId) {
        const [rows] = await pool.query(`
            SELECT cv.CustomerVoucherID, cv.Status, cv.ReceivedDate, cv.UsedDate,
                   v.VoucherID, v.Code, v.Description AS Title, v.DiscountValue, v.DiscountType, NULL as ExpiryDate
            FROM CustomerVouchers cv
            JOIN Vouchers v ON cv.VoucherID = v.VoucherID
            WHERE cv.CustomerID = ?
            ORDER BY cv.ReceivedDate DESC
        `, [customerId]);
        return rows;
    }

    static async getPointHistory(customerId) {
        const [rows] = await pool.query('SELECT * FROM PointHistory WHERE CustomerID = ? ORDER BY CreatedDate DESC', [customerId]);
        return rows;
    }
}

module.exports = CustomerRewardModel;
