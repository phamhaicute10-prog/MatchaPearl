const db = require('../config/db');

class DashboardModel {
    // ---- Dashboard Screen Data ----
    static async getCompletedOrdersByDateRange(start, end, managerId) {
        const [orders] = await db.query(`
            SELECT TotalAmount 
            FROM Orders 
            WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt <= ? AND UserID = ?
        `, [start, end, managerId]);
        return orders;
    }

    static async getDailyRevenue(startDay, endDay, managerId) {
        const [dayOrders] = await db.query(`
            SELECT SUM(TotalAmount) as revenue
            FROM Orders
            WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt < ? AND UserID = ?
        `, [startDay, endDay, managerId]);
        return dayOrders[0].revenue ? parseFloat(dayOrders[0].revenue) : 0;
    }

    static async getTopSellingItems(start, end, managerId) {
        const [topItems] = await db.query(`
            SELECT 
                IFNULL(p.ProductName, t.ToppingName) as ItemName,
                MAX(IFNULL(p.Image, t.Image)) as Image,
                SUM(oi.Quantity) as TotalSold,
                SUM(oi.SubTotal) as TotalRevenue
            FROM OrderItems oi
            JOIN Orders o ON oi.OrderID = o.OrderID
            LEFT JOIN Products p ON oi.ProductID = p.ProductID
            LEFT JOIN OrderItemToppings oit ON oi.OrderItemID = oit.OrderItemID AND oi.ProductID IS NULL
            LEFT JOIN Toppings t ON oit.ToppingID = t.ToppingID
            WHERE o.Status = 'COMPLETED' AND o.CreatedAt >= ? AND o.CreatedAt <= ? AND o.UserID = ?
            GROUP BY ItemName
            ORDER BY TotalSold DESC
            LIMIT 5
        `, [start, end, managerId]);
        return topItems;
    }

    // ---- Overview Screen Data ----
    static async getTotalRevenueAllTime(managerId) {
        const [orders] = await db.query(`
            SELECT SUM(TotalAmount) as TotalRevenue 
            FROM Orders 
            WHERE Status = 'COMPLETED' AND UserID = ?
        `, [managerId]);
        return parseFloat(orders[0].TotalRevenue || 0);
    }

    static async getTotalCostAllTime(managerId) {
        const [logs] = await db.query(`
            SELECT SUM(TotalCost) as TotalCost 
            FROM InventoryLogs 
            WHERE (Type = 'IMPORT' OR Type = 'INITIAL_STOCK') AND ManagerID = ?
        `, [managerId]);
        return parseFloat(logs[0].TotalCost || 0);
    }

    static async getDailyCost(startDay, endDay, managerId) {
        const [dayLogs] = await db.query(`
            SELECT SUM(TotalCost) as cost
            FROM InventoryLogs
            WHERE (Type = 'IMPORT' OR Type = 'INITIAL_STOCK') AND CreatedAt >= ? AND CreatedAt < ? AND ManagerID = ?
        `, [startDay, endDay, managerId]);
        return dayLogs[0].cost ? parseFloat(dayLogs[0].cost) : 0;
    }
}

module.exports = DashboardModel;
