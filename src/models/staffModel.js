const db = require('../config/db');

class StaffModel {
    static async getStaffsByManagerId(managerId) {
        const [rows] = await db.query(
            'SELECT UserID, Username, Password, FullName, Phone, Email, Role, Status FROM Users WHERE ManagerID = ?', 
            [managerId]
        );
        return rows;
    }

    static async getStaffByUsername(username) {
        const [rows] = await db.query('SELECT UserID FROM Users WHERE Username = ?', [username]);
        return rows;
    }

    static async getStaffByEmail(email, excludeUserId = null) {
        if (!email) return [];
        let query = "SELECT UserID FROM Users WHERE Email = ? AND Email != ''";
        let params = [email];
        
        if (excludeUserId) {
            query += " AND UserID != ?";
            params.push(excludeUserId);
        }
        
        const [rows] = await db.query(query, params);
        return rows;
    }

    static async createStaff(data) {
        const { username, password, fullName, phone, email, role, status, managerId } = data;
        await db.query(
            'INSERT INTO Users (Username, Password, FullName, Phone, Email, Role, Status, ManagerID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, password, fullName, phone, email, role || 'staff', status || 'active', managerId]
        );
    }

    static async deleteStaff(staffId, managerId) {
        await db.query('DELETE FROM Users WHERE UserID = ? AND ManagerID = ?', [staffId, managerId]);
    }

    static async updateStaff(staffId, managerId, data) {
        const { password, fullName, phone, email, role, status } = data;
        if (password && password.trim() !== '') {
            await db.query(
                'UPDATE Users SET Password = ?, FullName = ?, Phone = ?, Email = ?, Role = ?, Status = ? WHERE UserID = ? AND ManagerID = ?',
                [password, fullName, phone, email, role, status, staffId, managerId]
            );
        } else {
            await db.query(
                'UPDATE Users SET FullName = ?, Phone = ?, Email = ?, Role = ?, Status = ? WHERE UserID = ? AND ManagerID = ?',
                [fullName, phone, email, role, status, staffId, managerId]
            );
        }
    }
}

module.exports = StaffModel;
