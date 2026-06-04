const db = require('./src/config/db');

async function testDashboard() {
    try {
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
            WHERE o.Status = 'COMPLETED' AND o.UserID = 1
            GROUP BY ItemName
            ORDER BY TotalSold DESC
            LIMIT 5
        `);
        console.log('Query success:', topItems);
    } catch (e) {
        console.error('Query error:', e.message);
    } finally {
        process.exit(0);
    }
}
testDashboard();
