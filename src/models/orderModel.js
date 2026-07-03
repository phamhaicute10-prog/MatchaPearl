const db = require('../config/db');

class OrderModel {
    static async calculateOrderData(connection, userId, items, voucherId) {
        let originalTotalAmount = 0;
        let finalTotalAmount = 0;
        let discountAmount = 0;

        const processedItems = [];

        for (const item of items) {
            const isStandaloneTopping = item.productId < 0;
            const dbProductId = isStandaloneTopping ? null : item.productId;
            
            let basePrice = 0;
            let categoryId = null;

            if (isStandaloneTopping) {
                const toppingId = -item.productId - 1000;
                const [toppingRows] = await connection.query('SELECT Price FROM Toppings WHERE ToppingID = ?', [toppingId]);
                basePrice = toppingRows.length > 0 ? Number(toppingRows[0].Price) : 0;
            } else {
                const [productRows] = await connection.query('SELECT BasePrice, CategoryID FROM Products WHERE ProductID = ?', [dbProductId]);
                if (productRows.length > 0) {
                    basePrice = Number(productRows[0].BasePrice) || 0;
                    categoryId = Number(productRows[0].CategoryID) || 0;
                }
            }

            let toppingsTotal = 0;
            const processedToppings = [];
            
            if (!isStandaloneTopping && item.toppings && item.toppings.length > 0) {
                for (const t of item.toppings) {
                    const [tRows] = await connection.query('SELECT Price FROM Toppings WHERE ToppingID = ?', [t.toppingId]);
                    const tPrice = tRows.length > 0 ? Number(tRows[0].Price) || 0 : 0;
                    toppingsTotal += tPrice;
                    processedToppings.push({ toppingId: t.toppingId, price: tPrice });
                }
            } else if (isStandaloneTopping) {
                 const toppingId = -item.productId - 1000;
                 processedToppings.push({ toppingId: toppingId, price: basePrice });
                 toppingsTotal = basePrice;
                 basePrice = 0; 
            }

            const subTotal = (basePrice + toppingsTotal) * item.quantity;
            originalTotalAmount += subTotal;

            processedItems.push({
                productId: dbProductId,
                sugarLevel: item.sugarLevel,
                iceLevel: item.iceLevel,
                quantity: item.quantity,
                categoryId: categoryId,
                basePrice: basePrice,
                toppingsTotal: toppingsTotal,
                subTotal: subTotal,
                toppings: processedToppings,
                isStandaloneTopping: isStandaloneTopping
            });
        }

        if (voucherId) {
            const [voucherRows] = await connection.query('SELECT * FROM Vouchers WHERE VoucherID = ? AND Status = 1', [voucherId]);
            if (voucherRows.length > 0) {
                const v = voucherRows[0];
                if (v.DiscountType === 'PERCENTAGE') {
                    discountAmount = originalTotalAmount * (v.DiscountValue / 100);
                } else if (v.DiscountType === 'BUY_X_GET_Y') {
                    let x = Number(v.BuyQuantity) || 0;
                    let y = Number(v.GetQuantity) || 0;
                    if (x > 0 && y > 0) {
                        const groups = {};
                        for (const item of processedItems) {
                            if (item.productId !== null) {
                                if (!groups[item.productId]) groups[item.productId] = [];
                                groups[item.productId].push(item);
                            }
                        }
                        for (const pid in groups) {
                            const group = groups[pid];
                            let totalQty = 0;
                            for (const i of group) totalQty += i.quantity;
                            if (totalQty >= x + y) {
                                let sets = Math.floor(totalQty / (x + y));
                                let freeItems = sets * y;
                                discountAmount += (group[0].basePrice * freeItems);
                            }
                        }
                    }
                } else if (v.DiscountType === 'FREE_TOPPING') {
                    for (const item of processedItems) {
                        discountAmount += (Number(item.toppingsTotal) * Number(item.quantity));
                    }
                } else if (v.DiscountType === 'FIXED_PRICE') {
                    const targetCat = Number(v.TargetCategoryID) || 0;
                    const fixedPrice = Number(v.DiscountValue) || 0;
                    for (const item of processedItems) {
                        if (item.categoryId === targetCat) {
                            if (item.basePrice > fixedPrice) {
                                discountAmount += ((item.basePrice - fixedPrice) * item.quantity);
                            }
                        }
                    }
                }
            }
        }

        finalTotalAmount = originalTotalAmount - discountAmount;
        if (finalTotalAmount < 0) finalTotalAmount = 0;

        return { originalTotalAmount, finalTotalAmount, discountAmount, processedItems };
    }

    static async calculateOrder(managerId, items, voucherId) {
        let connection;
        try {
            connection = await db.getConnection();
            const { finalTotalAmount, processedItems } = await this.calculateOrderData(connection, managerId, items, voucherId);
            
            let discountAmount = 0;
            let originalTotalAmount = 0;
            for (const item of processedItems) {
                originalTotalAmount += item.subTotal;
            }
            discountAmount = originalTotalAmount - finalTotalAmount;
            if (discountAmount < 0) discountAmount = 0;

            return { finalTotalAmount, originalTotalAmount, discountAmount };
        } finally {
            if (connection) connection.release();
        }
    }

    static async createOrder(managerId, staffId, paymentMethod, items, voucherId, status = 'IN_PROGRESS', customerId = null, pointsUsed = 0, orderType = 'Tại chỗ') {
        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            let { originalTotalAmount, finalTotalAmount, discountAmount, processedItems } = await this.calculateOrderData(connection, managerId, items, voucherId);

            let discountFromPoints = 0;
            if (customerId && pointsUsed > 0) {
                const [custRows] = await connection.query('SELECT TotalPoints FROM Customers WHERE CustomerID = ? AND ManagerID = ?', [customerId, managerId]);
                if (custRows.length === 0 || custRows[0].TotalPoints < pointsUsed) {
                    throw new Error('Số điểm không đủ');
                }
                discountFromPoints = pointsUsed * 1000;
                if (discountFromPoints > finalTotalAmount) discountFromPoints = finalTotalAmount;
                finalTotalAmount -= discountFromPoints;
                await connection.query('UPDATE Customers SET TotalPoints = TotalPoints - ? WHERE CustomerID = ?', [pointsUsed, customerId]);
            }

            let pointsEarned = 0;
            if (customerId) {
                pointsEarned = Math.floor(finalTotalAmount / 10000);
            }

            const totalDiscountAmount = originalTotalAmount - (finalTotalAmount + discountFromPoints);

            const [orderResult] = await connection.query(
                'INSERT INTO Orders (UserID, TotalAmount, FinalAmount, DiscountAmount, PaymentMethod, Status, CreatedBy, CustomerID, PointsEarned, PointsUsed, DiscountFromPoints, OrderType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [managerId, originalTotalAmount, finalTotalAmount, totalDiscountAmount > 0 ? totalDiscountAmount : 0, paymentMethod, status, staffId, customerId, pointsEarned, pointsUsed, discountFromPoints, orderType]
            );
            const orderId = orderResult.insertId;

            if (customerId && pointsEarned > 0) {
                await connection.query('UPDATE Customers SET TotalPoints = TotalPoints + ? WHERE CustomerID = ?', [pointsEarned, customerId]);
                await connection.query("INSERT INTO PointHistory (CustomerID, PointsChange, Type, Reason) VALUES (?, ?, 'Tích điểm', ?)", [customerId, pointsEarned, 'Mua hàng POS: ORD-' + orderId]);
            }

            for (const item of processedItems) {
                const [itemResult] = await connection.query(
                    'INSERT INTO OrderItems (OrderID, ProductID, SugarLevel, IceLevel, Quantity, SubTotal) VALUES (?, ?, ?, ?, ?, ?)',
                    [orderId, item.productId, item.sugarLevel, item.iceLevel, item.quantity, item.subTotal]
                );
                const orderItemId = itemResult.insertId;

                for (const topping of item.toppings) {
                    await connection.query(
                        'INSERT INTO OrderItemToppings (OrderItemID, ToppingID, PriceAtOrder) VALUES (?, ?, ?)',
                        [orderItemId, topping.toppingId, topping.price]
                    );
                    
                    // Deduct stock for toppings
                    const [toppingRecipes] = await connection.query('SELECT IngredientID, Amount FROM Recipes WHERE ToppingID = ? AND ManagerID = ?', [topping.toppingId, managerId]);
                    for (const recipe of toppingRecipes) {
                        const totalDeduct = recipe.Amount * item.quantity;
                        const [updateResult] = await connection.query('UPDATE Ingredients SET CurrentStock = CurrentStock - ? WHERE IngredientID = ? AND ManagerID = ? AND CurrentStock >= ?', [totalDeduct, recipe.IngredientID, managerId, totalDeduct]);
                        if (updateResult.affectedRows === 0) {
                            throw new Error('Không đủ nguyên liệu trong kho để hoàn tất đơn hàng!');
                        }
                        await connection.query('INSERT INTO InventoryLogs (IngredientID, ChangeAmount, Type, ReferenceID, ManagerID, CreatedBy) VALUES (?, ?, \'SALE\', ?, ?, ?)', [recipe.IngredientID, -totalDeduct, orderId, managerId, staffId]);
                    }
                }

                // Deduct stock for products
                if (!item.isStandaloneTopping && item.productId) {
                    const [productRecipes] = await connection.query('SELECT IngredientID, Amount FROM Recipes WHERE ProductID = ? AND ManagerID = ?', [item.productId, managerId]);
                    for (const recipe of productRecipes) {
                        const totalDeduct = recipe.Amount * item.quantity;
                        const [updateResult] = await connection.query('UPDATE Ingredients SET CurrentStock = CurrentStock - ? WHERE IngredientID = ? AND ManagerID = ? AND CurrentStock >= ?', [totalDeduct, recipe.IngredientID, managerId, totalDeduct]);
                        if (updateResult.affectedRows === 0) {
                            throw new Error('Không đủ nguyên liệu trong kho để hoàn tất đơn hàng!');
                        }
                        await connection.query('INSERT INTO InventoryLogs (IngredientID, ChangeAmount, Type, ReferenceID, ManagerID, CreatedBy) VALUES (?, ?, \'SALE\', ?, ?, ?)', [recipe.IngredientID, -totalDeduct, orderId, managerId, staffId]);
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
                LEFT JOIN Users u ON o.CreatedBy = u.UserID 
                LEFT JOIN Customers c ON o.CustomerID = c.CustomerID
                WHERE o.UserID = ?
            `;
            const queryParams = [userId];

            if (status && status !== 'Tất cả trạng thái' && status !== 'Tất cả') {
                let statusVal = status;
                if (status === 'Chờ xác nhận' || status === 'PENDING') statusVal = 'PENDING';
                if (status === 'Đang làm' || status === 'IN_PROGRESS') statusVal = 'IN_PROGRESS';
                if (status === 'Đang giao' || status === 'DELIVERING') statusVal = 'DELIVERING';
                if (status === 'Đã hoàn thành' || status === 'Hoàn thành' || status === 'COMPLETED') statusVal = 'COMPLETED';
                if (status === 'Đã hủy' || status === 'CANCELLED') statusVal = 'CANCELLED';
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
            
            let query = `SELECT o.*, u.FullName as CashierName, c.FullName as CustomerName ${baseQuery} ORDER BY o.CreatedAt DESC LIMIT ? OFFSET ?`;
            
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
                SELECT o.*, u.FullName as CashierName, c.FullName as CustomerName
                FROM Orders o 
                LEFT JOIN Users u ON o.CreatedBy = u.UserID 
                LEFT JOIN Customers c ON o.CustomerID = c.CustomerID
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
