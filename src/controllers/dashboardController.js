const db = require('../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // Get total revenue and order count in range
            const [orders] = await db.query(`
                SELECT TotalAmount 
                FROM Orders 
                WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt <= ?
            `, [start, end]);

            let totalRevenue = 0;
            for (const order of orders) {
                totalRevenue += parseFloat(order.TotalAmount);
            }

            // Generate chart data for the range
            const chartData = [];
            const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            
            // Limit to 31 days for daily chart
            const daysToIterate = Math.min(diffDays, 31);
            for (let i = 0; i < daysToIterate; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const nextD = new Date(d);
                nextD.setDate(d.getDate() + 1);

                const [dayOrders] = await db.query(`
                    SELECT SUM(TotalAmount) as revenue
                    FROM Orders
                    WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt < ?
                `, [d, nextD]);
                
                const revenue = dayOrders[0].revenue ? parseFloat(dayOrders[0].revenue) : 0;
                const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                chartData.push({ date: dateStr, revenue: revenue });
            }

            // Top items in range
            const [topItems] = await db.query(`
                SELECT 
                    IFNULL(p.ProductName, t.ToppingName) as ItemName,
                    SUM(oi.Quantity) as TotalSold,
                    SUM(oi.SubTotal) as TotalRevenue
                FROM OrderItems oi
                JOIN Orders o ON oi.OrderID = o.OrderID
                LEFT JOIN Products p ON oi.ProductID = p.ProductID
                LEFT JOIN OrderItemToppings oit ON oi.OrderItemID = oit.OrderItemID AND oi.ProductID IS NULL
                LEFT JOIN Toppings t ON oit.ToppingID = t.ToppingID
                WHERE o.Status = 'COMPLETED' AND o.CreatedAt >= ? AND o.CreatedAt <= ?
                GROUP BY ItemName
                ORDER BY TotalSold DESC
                LIMIT 5
            `, [start, end]);

            return res.status(200).json({
                success: true,
                todayRevenue: totalRevenue,
                weekRevenue: totalRevenue,
                monthRevenue: totalRevenue,
                weekOrderCount: orders.length,
                chartData,
                topItems
            });
        }

        // Original logic for default view
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Get all completed orders within the month
        const [orders] = await db.query(`
            SELECT TotalAmount, CreatedAt
            FROM Orders 
            WHERE Status = 'COMPLETED' AND CreatedAt >= ?
        `, [startOfMonth]);

        let todayRevenue = 0;
        let weekRevenue = 0;
        let monthRevenue = 0;
        let weekOrderCount = 0;

        for (const order of orders) {
            const amount = parseFloat(order.TotalAmount);
            const createdAt = new Date(order.CreatedAt);

            monthRevenue += amount;

            if (createdAt >= startOfWeek) {
                weekRevenue += amount;
                weekOrderCount++;
            }

            if (createdAt >= startOfToday) {
                todayRevenue += amount;
            }
        }

        // Chart Data (Last 7 days)
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);

            const [dayOrders] = await db.query(`
                SELECT SUM(TotalAmount) as revenue
                FROM Orders
                WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt < ?
            `, [d, nextD]);
            
            const revenue = dayOrders[0].revenue ? parseFloat(dayOrders[0].revenue) : 0;
            const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            chartData.push({ date: dateStr, revenue: revenue });
        }

        // Top selling items
        const [topItems] = await db.query(`
            SELECT 
                IFNULL(p.ProductName, t.ToppingName) as ItemName,
                SUM(oi.Quantity) as TotalSold,
                SUM(oi.SubTotal) as TotalRevenue
            FROM OrderItems oi
            JOIN Orders o ON oi.OrderID = o.OrderID
            LEFT JOIN Products p ON oi.ProductID = p.ProductID
            LEFT JOIN OrderItemToppings oit ON oi.OrderItemID = oit.OrderItemID AND oi.ProductID IS NULL
            LEFT JOIN Toppings t ON oit.ToppingID = t.ToppingID
            WHERE o.Status = 'COMPLETED'
            GROUP BY ItemName
            ORDER BY TotalSold DESC
            LIMIT 5
        `);

        res.status(200).json({
            success: true,
            todayRevenue,
            weekRevenue,
            monthRevenue,
            weekOrderCount,
            chartData,
            topItems
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
