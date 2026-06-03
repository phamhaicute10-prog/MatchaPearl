const db = require('../config/db');

class ShiftModel {
    static async openShift(managerId, userId, startingCash) {
        const [result] = await db.query(
            "INSERT INTO Shifts (ManagerID, UserID, StartTime, StartingCash, Status) VALUES (?, ?, NOW(), ?, 'OPEN')",
            [managerId, userId, startingCash]
        );
        return result.insertId;
    }

    static async closeShift(shiftId, managerId, userId, endingCash, systemCash, totalRevenue, note) {
        const [result] = await db.query(
            "UPDATE Shifts SET EndTime = NOW(), EndingCash = ?, SystemCash = ?, TotalRevenue = ?, Note = ?, Status = 'CLOSED' WHERE ShiftID = ? AND UserID = ? AND ManagerID = ? AND Status = 'OPEN'",
            [endingCash, systemCash, totalRevenue, note, shiftId, userId, managerId]
        );
        return result.affectedRows;
    }

    static async getCurrentOpenShift(managerId, userId) {
        const [rows] = await db.query(
            "SELECT * FROM Shifts WHERE ManagerID = ? AND UserID = ? AND Status = 'OPEN' ORDER BY StartTime DESC LIMIT 1",
            [managerId, userId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    static async getShiftsByManager(managerId) {
        const [rows] = await db.query(
            "SELECT s.*, u.FullName as EmployeeName FROM Shifts s JOIN Users u ON s.UserID = u.UserID WHERE s.ManagerID = ? ORDER BY s.StartTime DESC LIMIT 50",
            [managerId]
        );
        return rows;
    }

    static async getShiftsByUser(managerId, userId) {
        const [rows] = await db.query(
            "SELECT s.*, u.FullName as EmployeeName FROM Shifts s JOIN Users u ON s.UserID = u.UserID WHERE s.ManagerID = ? AND s.UserID = ? ORDER BY s.StartTime DESC LIMIT 50",
            [managerId, userId]
        );
        return rows;
    }
}

module.exports = ShiftModel;
