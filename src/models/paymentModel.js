const pool = require('../config/db');

class PaymentModel {
    static async getPayOSKeys(userId) {
        const [rows] = await pool.query('SELECT PayosClientId, PayosApiKey, PayosChecksumKey FROM Users WHERE UserID = ?', [userId]);
        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = PaymentModel;
