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

    static async getShiftReport(shiftId) {
        // Lấy tổng quan ca
        const [shiftRows] = await db.query("SELECT * FROM Shifts WHERE ShiftID = ?", [shiftId]);
        if (shiftRows.length === 0) return null;
        const shift = shiftRows[0];

        // Lấy số đơn hàng và tổng doanh thu thực tế (đã trừ voucher)
        const [orderStats] = await db.query(`
            SELECT COUNT(*) as OrderCount, SUM(TotalAmount) as NetRevenue
            FROM Orders 
            WHERE ShiftID = ? AND Status != 'CANCELLED'
        `, [shiftId]);

        // Tính doanh thu theo danh mục sản phẩm (sử dụng SubTotal của OrderItems)
        const [categoryStats] = await db.query(`
            SELECT c.CategoryName, SUM(oi.Quantity) as TotalQuantity, SUM(oi.SubTotal) as CategoryRevenue
            FROM Orders o
            JOIN OrderItems oi ON o.OrderID = oi.OrderID
            JOIN Products p ON oi.ProductID = p.ProductID
            JOIN Categories c ON p.CategoryID = c.CategoryID
            WHERE o.ShiftID = ? AND o.Status != 'CANCELLED'
            GROUP BY c.CategoryID
        `, [shiftId]);

        // Tính doanh thu từ Topping (vì topping có thể đứng riêng hoặc kèm theo)
        const [toppingStats] = await db.query(`
            SELECT 'Topping' as CategoryName, 
                   COUNT(oit.ID) as TotalQuantity, 
                   SUM(oit.PriceAtOrder) as CategoryRevenue
            FROM Orders o
            JOIN OrderItems oi ON o.OrderID = oi.OrderID
            JOIN OrderItemToppings oit ON oi.OrderItemID = oit.OrderItemID
            WHERE o.ShiftID = ? AND o.Status != 'CANCELLED'
        `, [shiftId]);
        
        // Thêm nhóm topping đứng riêng lẻ (ProductID < 0)
        const [standaloneToppingStats] = await db.query(`
            SELECT 'Topping Bán Lẻ' as CategoryName,
                   SUM(oi.Quantity) as TotalQuantity,
                   SUM(oi.SubTotal) as CategoryRevenue
            FROM Orders o
            JOIN OrderItems oi ON o.OrderID = oi.OrderID
            WHERE o.ShiftID = ? AND o.Status != 'CANCELLED' AND oi.ProductID < 0
        `, [shiftId]);

        let combinedCategoryStats = [...categoryStats];
        if (toppingStats[0] && toppingStats[0].CategoryRevenue > 0) {
            combinedCategoryStats.push({
                CategoryName: 'Topping Kèm',
                TotalQuantity: toppingStats[0].TotalQuantity,
                CategoryRevenue: toppingStats[0].CategoryRevenue
            });
        }
        if (standaloneToppingStats[0] && standaloneToppingStats[0].CategoryRevenue > 0) {
            combinedCategoryStats.push({
                CategoryName: 'Topping Bán Lẻ',
                TotalQuantity: standaloneToppingStats[0].TotalQuantity,
                CategoryRevenue: standaloneToppingStats[0].CategoryRevenue
            });
        }

        return {
            shift: shift,
            orderCount: orderStats[0].OrderCount || 0,
            netRevenue: orderStats[0].NetRevenue || 0,
            categoryStats: combinedCategoryStats
        };
    }
}

module.exports = ShiftModel;
