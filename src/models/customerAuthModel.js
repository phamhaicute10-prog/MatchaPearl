const pool = require('../config/db');

class CustomerAuthModel {
    static async checkPhoneOrEmailExists(phone, email) {
        const [existing] = await pool.query('SELECT CustomerID FROM Customers WHERE Phone = ? OR Email = ?', [phone, email]);
        return existing.length > 0;
    }

    static async checkEmailInUsers(email) {
        const [existingUser] = await pool.query('SELECT UserID FROM Users WHERE Email = ?', [email]);
        return existingUser.length > 0;
    }

    static async getFirstAdminManagerId() {
        const [managers] = await pool.query("SELECT UserID FROM Users WHERE Role = 'admin' OR Role = 'manager' LIMIT 1");
        return managers.length > 0 ? managers[0].UserID : 0;
    }

    static async createCustomer(data) {
        const { managerId, fullName, phone, email, hashedPassword } = data;
        const [result] = await pool.query(
            "INSERT INTO Customers (ManagerID, FullName, Phone, Email, PasswordHash, TotalPoints, MembershipLevel) VALUES (?, ?, ?, ?, ?, 0, 'Đồng')",
            [managerId, fullName, phone, email, hashedPassword]
        );
        return result.insertId;
    }

    static async updateSessionId(customerId, sessionId) {
        await pool.query('UPDATE Customers SET CurrentSessionId = ? WHERE CustomerID = ?', [sessionId, customerId]);
    }
    
    static async clearSessionId(customerId) {
        await pool.query('UPDATE Customers SET CurrentSessionId = NULL WHERE CustomerID = ?', [customerId]);
    }

    static async getCustomerByEmail(email) {
        const [rows] = await pool.query(
            `SELECT CustomerID, FullName, Phone, Email, TotalPoints, 
                    CASE 
                        WHEN TotalPoints >= 60 THEN 'Vàng'
                        WHEN TotalPoints >= 30 THEN 'Bạc'
                        ELSE 'Đồng'
                    END AS MembershipLevel, 
                    Birthday, Gender, PasswordHash 
             FROM Customers WHERE Email = ?`,
            [email]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    static async getCustomerById(customerId) {
        const [rows] = await pool.query(
            `SELECT CustomerID, FullName, Phone, Email, TotalPoints, 
                    CASE 
                        WHEN TotalPoints >= 60 THEN 'Vàng'
                        WHEN TotalPoints >= 30 THEN 'Bạc'
                        ELSE 'Đồng'
                    END AS MembershipLevel, 
                    Birthday, Gender, PasswordHash
             FROM Customers WHERE CustomerID = ?`,
            [customerId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    static async updatePassword(customerId, hashedPassword) {
        await pool.query('UPDATE Customers SET PasswordHash = ? WHERE CustomerID = ?', [hashedPassword, customerId]);
    }

    static async checkOtherCustomerEmailPhone(phone, email, customerId) {
        if (email) {
            const [existing] = await pool.query('SELECT CustomerID FROM Customers WHERE (Phone = ? OR Email = ?) AND CustomerID != ?', [phone, email, customerId]);
            return existing.length > 0;
        } else {
            const [existing] = await pool.query('SELECT CustomerID FROM Customers WHERE Phone = ? AND CustomerID != ?', [phone, customerId]);
            return existing.length > 0;
        }
    }

    static async updateProfile(customerId, fullName, phone, email) {
        await pool.query('UPDATE Customers SET FullName = ?, Phone = ?, Email = ? WHERE CustomerID = ?', [fullName, phone, email, customerId]);
    }
}

module.exports = CustomerAuthModel;
