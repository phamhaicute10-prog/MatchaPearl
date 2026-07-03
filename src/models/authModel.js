const pool = require('../config/db');

class AuthModel {
    static async getUserByUsername(username) {
        const [rows] = await pool.query(
            'SELECT UserID, Username, FullName, Phone, Email, Password, PayosClientId, PayosApiKey, PayosChecksumKey, Avatar, Role, ManagerID, Status FROM Users WHERE Username = ?', 
            [username]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    static async getUserByEmail(email) {
        const [rows] = await pool.query('SELECT UserID, Username FROM Users WHERE Email = ?', [email]);
        return rows.length > 0 ? rows[0] : null;
    }

    static async getUserPassword(userId) {
        const [rows] = await pool.query('SELECT Password FROM Users WHERE UserID = ?', [userId]);
        return rows.length > 0 ? rows[0].Password : null;
    }

    static async updatePassword(userId, newPassword) {
        await pool.query('UPDATE Users SET Password = ? WHERE UserID = ?', [newPassword, userId]);
    }

    static async updateSessionId(userId, sessionId) {
        await pool.query('UPDATE Users SET CurrentSessionId = ? WHERE UserID = ?', [sessionId, userId]);
    }

    static async clearSessionId(userId) {
        await pool.query('UPDATE Users SET CurrentSessionId = NULL WHERE UserID = ?', [userId]);
    }

    static async checkUsernameExists(username) {
        const [rows] = await pool.query('SELECT UserID FROM Users WHERE Username = ?', [username]);
        return rows.length > 0;
    }

    static async createUser(data) {
        const { username, hashedPassword, fullName, phone, email } = data;
        const [result] = await pool.query(
            'INSERT INTO Users (Username, Password, FullName, Phone, Email) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, fullName || null, phone || null, email || null]
        );
        return result.insertId;
    }

    static async updateProfile(data) {
        const { userId, fullName, phone, email, payosClientId, payosApiKey, payosChecksumKey, avatarUrl } = data;
        
        let query = 'UPDATE Users SET FullName = ?, Phone = ?, Email = ?, PayosClientId = ?, PayosApiKey = ?, PayosChecksumKey = ?';
        let params = [fullName || null, phone || null, email || null, payosClientId || null, payosApiKey || null, payosChecksumKey || null];

        if (avatarUrl) {
            query += ', Avatar = ?';
            params.push(avatarUrl);
        }

        query += ' WHERE UserID = ?';
        params.push(userId);

        await pool.query(query, params);
    }
}

module.exports = AuthModel;
