const db = require('../config/db');

class CustomerModel {
    static async getCustomers(managerId) {
        try {
            const [rows] = await db.query(
                `SELECT c.*, 
                        COUNT(o.OrderID) AS OrderCount, 
                        COALESCE(SUM(o.FinalAmount), 0) AS TotalSpent, 
                        MAX(o.CreatedAt) AS LastOrderDate,
                        CASE 
                            WHEN c.TotalPoints >= 60 THEN 'Vàng'
                            WHEN c.TotalPoints >= 30 THEN 'Bạc'
                            ELSE 'Đồng'
                        END AS MembershipLevel
                 FROM Customers c
                 LEFT JOIN Orders o ON c.CustomerID = o.CustomerID AND o.Status = 'COMPLETED'
                 GROUP BY c.CustomerID
                 ORDER BY c.CreatedAt DESC`
            );
            return rows;
        } catch (err) {
            throw err;
        }
    }

    static async getCustomerByPhone(managerId, phone) {
        try {
            const [rows] = await db.query(
                `SELECT *,
                        CASE 
                            WHEN TotalPoints >= 60 THEN 'Vàng'
                            WHEN TotalPoints >= 30 THEN 'Bạc'
                            ELSE 'Đồng'
                        END AS MembershipLevel
                 FROM Customers WHERE Phone = ?`,
                [phone]
            );
            if (rows.length > 0) return rows[0];
            return null;
        } catch (err) {
            throw err;
        }
    }

    static async createCustomer(managerId, fullName, phone, email = null, password = null) {
        try {
            const [result] = await db.query(
                'INSERT INTO Customers (ManagerID, FullName, Phone, Email, PasswordHash, TotalPoints) VALUES (?, ?, ?, ?, ?, 0)',
                [managerId, fullName, phone, email, password]
            );
            return result.insertId;
        } catch (err) {
            throw err;
        }
    }

    static async updateCustomer(managerId, customerId, fullName, phone, email = null, password = null) {
        try {
            let query = 'UPDATE Customers SET FullName = ?, Phone = ?, Email = ? WHERE CustomerID = ?';
            let params = [fullName, phone, email, customerId];

            if (password !== null && password.trim() !== '') {
                query = 'UPDATE Customers SET FullName = ?, Phone = ?, Email = ?, PasswordHash = ? WHERE CustomerID = ?';
                params = [fullName, phone, email, password, customerId];
            }

            const [result] = await db.query(query, params);
            return result.affectedRows > 0;
        } catch (err) {
            throw err;
        }
    }

    static async updatePoints(customerId, managerId, pointsChange) {
        try {
            const [result] = await db.query(
                'UPDATE Customers SET TotalPoints = TotalPoints + ? WHERE CustomerID = ?',
                [pointsChange, customerId]
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
            const [result] = await connection.query('DELETE FROM Customers WHERE CustomerID = ?', [customerId]);

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
