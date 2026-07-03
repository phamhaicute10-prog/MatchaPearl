const db = require('../config/db');
const OrderModel = require('./orderModel');

class CustomerOrderModel {
    static async createOnlineOrder(customerId, data) {
        let connection;
        try {
            const { items, paymentMethod, orderType, shippingAddress, voucherId } = data;
            
            connection = await db.getConnection();
            await connection.beginTransaction();

            // Lấy ManagerID từ khách hàng hiện tại
            const [custRows] = await connection.query('SELECT ManagerID FROM Customers WHERE CustomerID = ?', [customerId]);
            let managerId = custRows.length > 0 ? custRows[0].ManagerID : null;

            if (!managerId) {
                const [managers] = await connection.query("SELECT UserID FROM Users WHERE Role = 'admin' ORDER BY UserID ASC LIMIT 1");
                managerId = managers.length > 0 ? managers[0].UserID : null;
            }

            if (!managerId) throw new Error('Không tìm thấy quản lý hợp lệ để tạo đơn hàng');

            const { finalTotalAmount, processedItems } = await OrderModel.calculateOrderData(connection, managerId, items, voucherId);
            
            let shippingFee = 0;
            if (orderType === 'Giao hàng') {
                shippingFee = 15000;
            }

            const totalPay = finalTotalAmount + shippingFee;

            const [orderResult] = await connection.query(
                `INSERT INTO Orders (UserID, CreatedBy, ShiftID, TotalAmount, FinalAmount, ShippingFee, PaymentMethod, OrderType, ShippingAddress, Status, CustomerID, VoucherID) 
                 VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
                [managerId, finalTotalAmount, totalPay, shippingFee, paymentMethod || 'COD', orderType || 'Giao hàng', shippingAddress, customerId, voucherId || null]
            );
            const orderId = orderResult.insertId;

            for (const item of processedItems) {
                let dbProductId = item.productId;
                if (item.isStandaloneTopping) {
                    dbProductId = null;
                }
                
                const [itemResult] = await connection.query(
                    'INSERT INTO OrderItems (OrderID, ProductID, SugarLevel, IceLevel, Quantity, SubTotal) VALUES (?, ?, ?, ?, ?, ?)',
                    [orderId, dbProductId, item.sugarLevel, item.iceLevel, item.quantity, item.subTotal]
                );
                const orderItemId = itemResult.insertId;

                if (item.toppings && item.toppings.length > 0) {
                    for (const t of item.toppings) {
                        await connection.query(
                            'INSERT INTO OrderItemToppings (OrderItemID, ToppingID, PriceAtOrder) VALUES (?, ?, ?)',
                            [orderItemId, t.toppingId, t.price]
                        );

                        const [toppingRecipes] = await connection.query('SELECT IngredientID, Amount FROM Recipes WHERE ToppingID = ? AND ManagerID = ?', [t.toppingId, managerId]);
                        for (const recipe of toppingRecipes) {
                            const totalDeduct = recipe.Amount * item.quantity;
                            const [updateResult] = await connection.query('UPDATE Ingredients SET CurrentStock = CurrentStock - ? WHERE IngredientID = ? AND ManagerID = ? AND CurrentStock >= ?', [totalDeduct, recipe.IngredientID, managerId, totalDeduct]);
                            if (updateResult.affectedRows === 0) {
                                throw new Error('Không đủ nguyên liệu trong kho để làm topping!');
                            }
                            await connection.query("INSERT INTO InventoryLogs (IngredientID, ChangeAmount, Type, ReferenceID, ManagerID, CreatedBy) VALUES (?, ?, 'SALE', ?, ?, ?)", [recipe.IngredientID, -totalDeduct, orderId, managerId, managerId]);
                        }
                    }
                }

                if (!item.isStandaloneTopping) {
                    const [productRecipes] = await connection.query('SELECT IngredientID, Amount FROM Recipes WHERE ProductID = ? AND ManagerID = ?', [dbProductId, managerId]);
                    for (const recipe of productRecipes) {
                        const totalDeduct = recipe.Amount * item.quantity;
                        const [updateResult] = await connection.query('UPDATE Ingredients SET CurrentStock = CurrentStock - ? WHERE IngredientID = ? AND ManagerID = ? AND CurrentStock >= ?', [totalDeduct, recipe.IngredientID, managerId, totalDeduct]);
                        if (updateResult.affectedRows === 0) {
                            throw new Error('Không đủ nguyên liệu trong kho để làm món này!');
                        }
                        await connection.query("INSERT INTO InventoryLogs (IngredientID, ChangeAmount, Type, ReferenceID, ManagerID, CreatedBy) VALUES (?, ?, 'SALE', ?, ?, ?)", [recipe.IngredientID, -totalDeduct, orderId, managerId, managerId]);
                    }
                }
            }

            const pointsEarned = Math.floor(finalTotalAmount / 10000);
            if (pointsEarned > 0) {
                await connection.query('UPDATE Customers SET TotalPoints = TotalPoints + ? WHERE CustomerID = ?', [pointsEarned, customerId]);
                await connection.query("INSERT INTO PointHistory (CustomerID, PointsChange, Type, Reason) VALUES (?, ?, 'Tích điểm', ?)", [customerId, pointsEarned, 'Mua hàng online: ORD-' + orderId]);
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

    static async getMyOrders(customerId) {
        const [rows] = await db.query('SELECT *, CreatedAt as CreatedDate FROM Orders WHERE CustomerID = ? ORDER BY CreatedAt DESC', [customerId]);
        return rows;
    }

    static async getMyOrderDetails(orderId, customerId) {
        const [orders] = await db.query('SELECT *, CreatedAt as CreatedDate FROM Orders WHERE OrderID = ? AND CustomerID = ?', [orderId, customerId]);
        if (orders.length === 0) return null;
        
        const order = orders[0];

        const [items] = await db.query(`
            SELECT oi.*, p.ProductName, p.BasePrice, p.Image 
            FROM OrderItems oi
            LEFT JOIN Products p ON oi.ProductID = p.ProductID
            WHERE oi.OrderID = ?
        `, [orderId]);

        for (let item of items) {
            if (item.ProductID === null) {
                const [toppings] = await db.query(`
                    SELECT oit.*, t.ToppingName, oit.PriceAtOrder as Price, t.Image
                    FROM OrderItemToppings oit
                    JOIN Toppings t ON oit.ToppingID = t.ToppingID
                    WHERE oit.OrderItemID = ?
                `, [item.OrderItemID]);
                
                if (toppings.length > 0) {
                    item.ProductName = toppings[0].ToppingName;
                    item.BasePrice = toppings[0].Price;
                    item.Image = toppings[0].Image;
                }
                item.toppings = [];
            } else {
                const [toppings] = await db.query(`
                    SELECT oit.*, t.ToppingName 
                    FROM OrderItemToppings oit
                    JOIN Toppings t ON oit.ToppingID = t.ToppingID
                    WHERE oit.OrderItemID = ?
                `, [item.OrderItemID]);
                item.toppings = toppings;
            }
        }
        order.items = items;
        return order;
    }

    static async getOrderStatus(orderId, customerId) {
        const [orders] = await db.query("SELECT Status FROM Orders WHERE OrderID = ? AND CustomerID = ?", [orderId, customerId]);
        return orders.length > 0 ? orders[0].Status : null;
    }

    static async updateOrderStatus(orderId, newStatus) {
        await db.query("UPDATE Orders SET Status = ? WHERE OrderID = ?", [newStatus, orderId]);
    }
}

module.exports = CustomerOrderModel;
