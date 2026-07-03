const StaffModel = require('../models/staffModel');

exports.getStaffs = async (req, res) => {
    try {
        const managerId = req.userId;
        const staffs = await StaffModel.getStaffsByManagerId(managerId);
        res.json({ success: true, staffs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.addStaff = async (req, res) => {
    try {
        const managerId = req.userId;
        const { username, password, fullName, phone, email, role, status } = req.body;

        const existing = await StaffModel.getStaffByUsername(username);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });

        const existingEmail = await StaffModel.getStaffByEmail(email);
        if (existingEmail.length > 0) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });

        await StaffModel.createStaff({ username, password, fullName, phone, email, role, status, managerId });
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const managerId = req.userId;
        const staffId = req.params.id;
        await StaffModel.deleteStaff(staffId, managerId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const managerId = req.userId;
        const staffId = req.params.id;
        const { password, fullName, phone, email, role, status } = req.body;

        const existingEmail = await StaffModel.getStaffByEmail(email, staffId);
        if (existingEmail.length > 0) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });

        await StaffModel.updateStaff(staffId, managerId, { password, fullName, phone, email, role, status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
