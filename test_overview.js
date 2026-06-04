const db = require('./src/config/db');

async function testOverview() {
    try {
        const userId = 1;
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 6); // Default 7 days
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);

        console.log('Querying revenue...');
        const [orders] = await db.query(`
            SELECT SUM(TotalAmount) as TotalRevenue 
            FROM Orders 
            WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt <= ? AND UserID = ?
        `, [start, end, userId]);
        const totalRevenue = parseFloat(orders[0].TotalRevenue || 0);

        console.log('Querying cost...');
        const [logs] = await db.query(`
            SELECT SUM(TotalCost) as TotalCost 
            FROM InventoryLogs 
            WHERE (Type = 'IMPORT' OR Type = 'INITIAL_STOCK') AND CreatedAt >= ? AND CreatedAt <= ? AND ManagerID = ?
        `, [start, end, userId]);
        const totalCost = parseFloat(logs[0].TotalCost || 0);

        console.log('Success!', { totalRevenue, totalCost });
    } catch (e) {
        console.error('Error in overview query:', e.message);
    } finally {
        process.exit(0);
    }
}
testOverview();
