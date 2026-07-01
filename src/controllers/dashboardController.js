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
                WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt <= ? AND UserID = ?
            `, [start, end, req.userId]);

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
                    WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt < ? AND UserID = ?
                `, [d, nextD, req.userId]);
                
                const revenue = dayOrders[0].revenue ? parseFloat(dayOrders[0].revenue) : 0;
                const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                chartData.push({ date: dateStr, revenue: revenue });
            }

            // Top items in range
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
            `, [start, end, req.userId]);

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

        const minDate = startOfWeek < startOfMonth ? startOfWeek : startOfMonth;

        // Get all completed orders within the relevant period
        const [orders] = await db.query(`
            SELECT TotalAmount, CreatedAt
            FROM Orders 
            WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND UserID = ?
        `, [minDate, req.userId]);

        let todayRevenue = 0;
        let weekRevenue = 0;
        let monthRevenue = 0;
        let weekOrderCount = 0;

        for (const order of orders) {
            const amount = parseFloat(order.TotalAmount);
            const createdAt = new Date(order.CreatedAt);

            if (createdAt >= startOfMonth) {
                monthRevenue += amount;
            }

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
                WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt < ? AND UserID = ?
            `, [d, nextD, req.userId]);
            
            const revenue = dayOrders[0].revenue ? parseFloat(dayOrders[0].revenue) : 0;
            const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            chartData.push({ date: dateStr, revenue: revenue });
        }

        // Top selling items
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
            WHERE o.Status = 'COMPLETED' AND o.UserID = ?
            GROUP BY ItemName
            ORDER BY TotalSold DESC
            LIMIT 5
        `, [req.userId]);

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

exports.getOverviewData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let start, end;
        
        if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            const today = new Date();
            start = new Date(today);
            start.setDate(today.getDate() - 6); // Default 7 days
            start.setHours(0, 0, 0, 0);
            end = new Date(today);
            end.setHours(23, 59, 59, 999);
        }

        // 1. Get total revenue in system (All time)
        const [orders] = await db.query(`
            SELECT SUM(TotalAmount) as TotalRevenue 
            FROM Orders 
            WHERE Status = 'COMPLETED' AND UserID = ?
        `, [req.userId]);
        const totalRevenue = parseFloat(orders[0].TotalRevenue || 0);

        // 2. Get total cost in system (All time)
        const [logs] = await db.query(`
            SELECT SUM(TotalCost) as TotalCost 
            FROM InventoryLogs 
            WHERE (Type = 'IMPORT' OR Type = 'INITIAL_STOCK') AND ManagerID = ?
        `, [req.userId]);
        const totalCost = parseFloat(logs[0].TotalCost || 0);

        // 3. Generate chart data (Revenue vs Cost)
        const chartData = [];
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const daysToIterate = Math.min(diffDays, 31);
        
        for (let i = 0; i < daysToIterate; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);

            const [dayOrders] = await db.query(`
                SELECT SUM(TotalAmount) as revenue
                FROM Orders
                WHERE Status = 'COMPLETED' AND CreatedAt >= ? AND CreatedAt < ? AND UserID = ?
            `, [d, nextD, req.userId]);
            
            const [dayLogs] = await db.query(`
                SELECT SUM(TotalCost) as cost
                FROM InventoryLogs
                WHERE (Type = 'IMPORT' OR Type = 'INITIAL_STOCK') AND CreatedAt >= ? AND CreatedAt < ? AND ManagerID = ?
            `, [d, nextD, req.userId]);

            const revenue = dayOrders[0].revenue ? parseFloat(dayOrders[0].revenue) : 0;
            const cost = dayLogs[0].cost ? parseFloat(dayLogs[0].cost) : 0;
            const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            
            chartData.push({ date: dateStr, revenue, cost });
        }

        res.status(200).json({
            success: true,
            totalRevenue,
            totalCost,
            netProfit: totalRevenue - totalCost,
            chartData
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
