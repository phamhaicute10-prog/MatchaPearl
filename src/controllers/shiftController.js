const ShiftModel = require('../models/shiftModel');

exports.openShift = async (req, res) => {
    try {
        const { startingCash } = req.body;
        const managerId = req.userId; 
        const userId = req.staffId || req.userId;
        
        const existing = await ShiftModel.getCurrentOpenShift(managerId, userId);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bạn đang có một ca làm việc chưa đóng' });
        }

        const shiftId = await ShiftModel.openShift(managerId, userId, startingCash || 0);
        res.json({ success: true, shiftId, message: 'Mở ca thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.closeShift = async (req, res) => {
    try {
        const { shiftId, endingCash, systemCash, totalRevenue, note } = req.body;
        const managerId = req.userId;
        const userId = req.staffId || req.userId;

        const affected = await ShiftModel.closeShift(shiftId, managerId, userId, endingCash || 0, systemCash || 0, totalRevenue || 0, note);
        if (affected === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc đang mở' });
        }
        res.json({ success: true, message: 'Đóng ca thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCurrentShift = async (req, res) => {
    try {
        const managerId = req.userId;
        const userId = req.staffId || req.userId;
        const shift = await ShiftModel.getCurrentOpenShift(managerId, userId);
        res.json({ success: true, shift });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getShifts = async (req, res) => {
    try {
        const managerId = req.userId;
        const shifts = await ShiftModel.getShiftsByManager(managerId);
        res.json({ success: true, shifts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};
