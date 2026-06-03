const db = require('../config/db');

exports.getStaffs = async (req, res) => {
    try {
        const managerId = req.userId;
        const [rows] = await db.query('SELECT UserID, Username, FullName, Phone, Email, Role, Status FROM Users WHERE ManagerID = ?', [managerId]);
        res.json({ success: true, staffs: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.addStaff = async (req, res) => {
    try {
        const managerId = req.userId;
        const { username, password, fullName, phone, email, role, status } = req.body;

        const [existing] = await db.query('SELECT UserID FROM Users WHERE Username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });

        const [existingEmail] = email ? await db.query('SELECT UserID FROM Users WHERE Email = ? AND Email != ""', [email]) : [[]];
        if (existingEmail.length > 0) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });

        await db.query(
            'INSERT INTO Users (Username, Password, FullName, Phone, Email, Role, Status, ManagerID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, password, fullName, phone, email, role || 'staff', status || 'active', managerId]
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
