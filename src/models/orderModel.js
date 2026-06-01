const db = require('../config/db');

class OrderModel {
    static async createOrder(userId, totalAmount, paymentMethod, items, status = 'COMPLETED') {
        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            const [orderResult] = await connection.query(
                'INSERT INTO Orders (UserID, TotalAmount, PaymentMethod, Status) VALUES (?, ?, ?, ?)',
                [userId, totalAmount, paymentMethod, status]
            );
            const orderId = orderResult.insertId;

            for (const item of items) {
                const isStandaloneTopping = item.productId < 0;
                const dbProductId = isStandaloneTopping ? null : item.productId;

                const [itemResult] = await connection.query(
                    'INSERT INTO OrderItems (OrderID, ProductID, SugarLevel, IceLevel, Quantity, SubTotal) VALUES (?, ?, ?, ?, ?, ?)',
                    [orderId, dbProductId, item.sugarLevel, item.iceLevel, item.quantity, item.subTotal]
                );
                const orderItemId = itemResult.insertId;

                if (isStandaloneTopping) {
                    const toppingId = -item.productId - 1000;
                    const [toppingRows] = await connection.query(
                        'SELECT Price FROM Toppings WHERE ToppingID = ?',
                        [toppingId]
                    );
                    const toppingPrice = toppingRows.length > 0 ? toppingRows[0].Price : 0;
                    await connection.query(
                        'INSERT INTO OrderItemToppings (OrderItemID, ToppingID, PriceAtOrder) VALUES (?, ?, ?)',
                        [orderItemId, toppingId, toppingPrice]
                    );
                } else if (item.toppings && item.toppings.length > 0) {
                    for (const topping of item.toppings) {
                        await connection.query(
                            'INSERT INTO OrderItemToppings (OrderItemID, ToppingID, PriceAtOrder) VALUES (?, ?, ?)',
                            [orderItemId, topping.toppingId, topping.price]
                        );
                    }
                }
            }

            await connection.commit();
            return orderId;
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    static async getOrders(filters = {}, userId) {
        try {
            let { page = 1, limit = 10, status, startDate, endDate, search } = filters;
            page = parseInt(page) || 1;
            limit = parseInt(limit) || 10;

            let baseQuery = `
                FROM Orders o 
                LEFT JOIN Users u ON o.UserID = u.UserID 
                WHERE o.UserID = ?
            `;
            const queryParams = [userId];

            if (status && status !== 'Tất cả trạng thái' && status !== 'Tất cả') {
                let statusVal = status;
                if (status === 'Đã hoàn thành') statusVal = 'COMPLETED';
                if (status === 'Đã hủy') statusVal = 'CANCELLED';
                baseQuery += ` AND o.Status = ?`;
                queryParams.push(statusVal);
            }

            if (startDate) {
                baseQuery += ` AND DATE(o.CreatedAt) >= ?`;
                queryParams.push(startDate);
            }

            if (endDate) {
                baseQuery += ` AND DATE(o.CreatedAt) <= ?`;
                queryParams.push(endDate);
            }

            if (search) {
                baseQuery += ` AND (o.OrderID LIKE ? OR u.FullName LIKE ?)`;
                queryParams.push(`%${search}%`, `%${search}%`);
            }

            const [countResult] = await db.query(`SELECT COUNT(*) as total ${baseQuery}`, queryParams);
            const total = countResult[0].total;

            const offset = (page - 1) * limit;
            
            let query = `SELECT o.*, u.FullName as CashierName ${baseQuery} ORDER BY o.CreatedAt DESC LIMIT ? OFFSET ?`;
            
            const finalParams = [...queryParams, limit, offset];

            const [rows] = await db.query(query, finalParams);
            
            return {
                orders: rows,
                total: total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (err) {
            throw err;
        }
    }

    static async getOrderDetails(orderId, userId) {
        try {
            const [orders] = await db.query(`
                SELECT o.*, u.FullName as CashierName 
                FROM Orders o 
                LEFT JOIN Users u ON o.UserID = u.UserID 
                WHERE o.OrderID = ? AND o.UserID = ?
            `, [orderId, userId]);
            
            if (orders.length === 0) return null;
            const order = orders[0];

            const [items] = await db.query(`
                SELECT oi.*, p.ProductName, p.BasePrice 
                FROM OrderItems oi
                LEFT JOIN Products p ON oi.ProductID = p.ProductID
                WHERE oi.OrderID = ?
            `, [orderId]);

            for (let item of items) {
                const [toppings] = await db.query(`
                    SELECT oit.*, t.ToppingName, oit.PriceAtOrder as Price
                    FROM OrderItemToppings oit
                    JOIN Toppings t ON oit.ToppingID = t.ToppingID
                    WHERE oit.OrderItemID = ?
                `, [item.OrderItemID]);
                
                if (item.ProductID === null && toppings.length > 0) {
                    item.ProductName = toppings[0].ToppingName;
                    item.BasePrice = toppings[0].Price;
                    item.toppings = [];
                } else {
                    item.toppings = toppings;
                }
            }

            order.items = items;
            return order;
        } catch (err) {
            throw err;
        }
    }
    static async updateOrderStatus(orderId, status, userId) {
        try {
            const [result] = await db.query(
                "UPDATE Orders SET Status = ? WHERE OrderID = ? AND UserID = ?",
                [status, orderId, userId]
            );
            return result.affectedRows > 0;
        } catch (err) {
            throw err;
        }
    }

    static async cancelOrder(orderId, userId) {
        try {
            const [result] = await db.query(
                "UPDATE Orders SET Status = 'CANCELLED' WHERE OrderID = ? AND UserID = ?",
                [orderId, userId]
            );
            return result.affectedRows > 0;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = OrderModel;
