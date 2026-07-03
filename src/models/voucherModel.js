const pool = require('../config/db');

class VoucherModel {
    static async getAllVouchers(userId) {
        const [rows] = await pool.query('SELECT * FROM Vouchers WHERE UserID = ? ORDER BY CreatedAt DESC', [userId]);
        return rows;
    }

    static async createVoucher(data) {
        const { code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status, userId } = data;
        const query = `
            INSERT INTO Vouchers (Code, Description, DiscountType, DiscountValue, BuyQuantity, GetQuantity, TargetCategoryID, Status, UserID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status ?? 1, userId];
        const [result] = await pool.query(query, params);
        return result.insertId;
    }

    static async updateVoucher(voucherId, userId, data) {
        const { code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status } = data;
        const query = `
            UPDATE Vouchers 
            SET Code = ?, Description = ?, DiscountType = ?, DiscountValue = ?, BuyQuantity = ?, GetQuantity = ?, TargetCategoryID = ?, Status = ?
            WHERE VoucherID = ? AND UserID = ?
        `;
        const params = [code, description, discountType, discountValue, buyQuantity, getQuantity, targetCategoryId, status, voucherId, userId];
        const [result] = await pool.query(query, params);
        return result.affectedRows;
    }

    static async deleteVoucher(voucherId, userId) {
        const [result] = await pool.query('DELETE FROM Vouchers WHERE VoucherID = ? AND UserID = ?', [voucherId, userId]);
        return result.affectedRows;
    }
}

module.exports = VoucherModel;
