const db = require('../config/db');

exports.getStaffs = async (req, res) => {
    try {
        const managerId = req.userId;
        const [rows] = await db.query('SELECT UserID, Username, FullName, Phone, Role FROM Users WHERE ManagerID = ?', [managerId]);
        res.json({ success: true, staffs: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.addStaff = async (req, res) => {
    try {
        const managerId = req.userId;
        const { username, password, fullName, phone } = req.body;

        const [existing] = await db.query('SELECT UserID FROM Users WHERE Username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Username exists' });

        await db.query(
            'INSERT INTO Users (Username, Password, FullName, Phone, Role, ManagerID) VALUES (?, ?, ?, ?, "staff", ?)',
            [username, password, fullName, phone, managerId]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const managerId = req.userId;
        const staffId = req.params.id;
        await db.query('DELETE FROM Users WHERE UserID = ? AND ManagerID = ?', [staffId, managerId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
