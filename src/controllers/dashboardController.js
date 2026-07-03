const DashboardModel = require('../models/dashboardModel');

exports.getDashboardData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const orders = await DashboardModel.getCompletedOrdersByDateRange(start, end, req.userId);
            
            let totalRevenue = 0;
            for (const order of orders) {
                totalRevenue += parseFloat(order.TotalAmount);
            }

            const chartData = [];
            const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const daysToIterate = Math.min(diffDays, 31);
            
            for (let i = 0; i < daysToIterate; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const nextD = new Date(d);
                nextD.setDate(d.getDate() + 1);

                const revenue = await DashboardModel.getDailyRevenue(d, nextD, req.userId);
                const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                chartData.push({ date: dateStr, revenue: revenue });
            }

            const topItems = await DashboardModel.getTopSellingItems(start, end, req.userId);

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

        const endOfToday = new Date(); // To current time
        
        const orders = await DashboardModel.getCompletedOrdersByDateRange(minDate, endOfToday, req.userId);

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

        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);

            const revenue = await DashboardModel.getDailyRevenue(d, nextD, req.userId);
            const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            chartData.push({ date: dateStr, revenue: revenue });
        }

        const topItems = await DashboardModel.getTopSellingItems(minDate, endOfToday, req.userId);

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

        const totalRevenue = await DashboardModel.getTotalRevenueAllTime(req.userId);
        const totalCost = await DashboardModel.getTotalCostAllTime(req.userId);

        const chartData = [];
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const daysToIterate = Math.min(diffDays, 31);
        
        for (let i = 0; i < daysToIterate; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);

            const revenue = await DashboardModel.getDailyRevenue(d, nextD, req.userId);
            const cost = await DashboardModel.getDailyCost(d, nextD, req.userId);
            
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
