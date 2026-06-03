const db = require('../config/db');

class CustomerModel {
    static async getCustomers(managerId) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM Customers WHERE ManagerID = ? ORDER BY CreatedAt DESC',
                [managerId]
            );
            return rows;
        } catch (err) {
            throw err;
        }
    }

    static async getCustomerByPhone(managerId, phone) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM Customers WHERE ManagerID = ? AND Phone = ?',
                [managerId, phone]
            );
            if (rows.length > 0) return rows[0];
            return null;
        } catch (err) {
            throw err;
        }
    }

    static async createCustomer(managerId, fullName, phone) {
        try {
            const [result] = await db.query(
                'INSERT INTO Customers (ManagerID, FullName, Phone, TotalPoints) VALUES (?, ?, ?, 0)',
                [managerId, fullName, phone]
            );
            return result.insertId;
        } catch (err) {
            throw err;
        }
    }

    static async updatePoints(customerId, managerId, pointsChange) {
        try {
            const [result] = await db.query(
                'UPDATE Customers SET TotalPoints = TotalPoints + ? WHERE CustomerID = ? AND ManagerID = ?',
                [pointsChange, customerId, managerId]
            );
            return result.affectedRows > 0;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = CustomerModel;
