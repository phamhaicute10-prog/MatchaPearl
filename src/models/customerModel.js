const db = require('../config/db');

class CustomerModel {
    static async getCustomers(managerId) {
        try {
            const [rows] = await db.query(
                `SELECT c.*, 
                        COUNT(o.OrderID) AS OrderCount, 
                        COALESCE(SUM(o.FinalAmount), 0) AS TotalSpent, 
                        MAX(o.CreatedAt) AS LastOrderDate
                 FROM Customers c
                 LEFT JOIN Orders o ON c.CustomerID = o.CustomerID AND o.Status = 'COMPLETED'
                 WHERE c.ManagerID = ?
                 GROUP BY c.CustomerID
                 ORDER BY c.CreatedAt DESC`,
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

    static async createCustomer(managerId, fullName, phone, email = null) {
        try {
            const [result] = await db.query(
                'INSERT INTO Customers (ManagerID, FullName, Phone, Email, TotalPoints) VALUES (?, ?, ?, ?, 0)',
                [managerId, fullName, phone, email]
            );
            return result.insertId;
        } catch (err) {
            throw err;
        }
    }

    static async updateCustomer(managerId, customerId, fullName, phone, email = null) {
        try {
            const [result] = await db.query(
                'UPDATE Customers SET FullName = ?, Phone = ?, Email = ? WHERE CustomerID = ? AND ManagerID = ?',
                [fullName, phone, email, customerId, managerId]
            );
            return result.affectedRows > 0;
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

    static async deleteCustomer(managerId, customerId) {
        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            // Gán CustomerID = NULL trong Orders để tránh mất dữ liệu doanh thu
            await connection.query('UPDATE Orders SET CustomerID = NULL WHERE CustomerID = ?', [customerId]);

            // Xóa Khách hàng (các bảng liên quan có ON DELETE CASCADE)
            const [result] = await connection.query('DELETE FROM Customers WHERE CustomerID = ? AND ManagerID = ?', [customerId, managerId]);

            await connection.commit();
            return result.affectedRows > 0;
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = CustomerModel;
