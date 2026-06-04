const db = require('../config/db');
const OrderModel = require('../models/orderModel'); // Sử dụng hàm calculateOrderData

exports.createOnlineOrder = async (req, res) => {
    let connection;
    try {
        const { items, paymentMethod, orderType, shippingAddress, voucherId } = req.body;
        // Trích xuất customerId từ header (đã check ở auth middleware hoặc params)
        const customerId = req.headers['customer-id'];
        
        if (!customerId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Dữ liệu đơn hàng không hợp lệ' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Lấy ManagerID mặc định (giả sử hệ thống 1 chi nhánh)
        const [managers] = await connection.query("SELECT UserID FROM Users WHERE Role = 'admin' OR Role = 'manager' LIMIT 1");
        const managerId = managers.length > 0 ? managers[0].UserID : 0;

        // 2. Tính toán tiền hàng
        const { finalTotalAmount, processedItems } = await OrderModel.calculateOrderData(connection, managerId, items, voucherId);
        
        // 3. Phí ship (giả lập 15k nếu là Giao hàng)
        let shippingFee = 0;
        if (orderType === 'Giao hàng') {
            shippingFee = 15000;
        }

        const totalPay = finalTotalAmount + shippingFee;

        // 4. Tạo Order (sử dụng đúng schema: UserID = managerId, CreatedBy = null vì khách hàng tự đặt)
        const [orderResult] = await connection.query(
            `INSERT INTO Orders (UserID, CreatedBy, ShiftID, TotalAmount, FinalAmount, ShippingFee, PaymentMethod, OrderType, ShippingAddress, Status, CustomerID, VoucherID) 
             VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
            [managerId, finalTotalAmount, totalPay, shippingFee, paymentMethod || 'COD', orderType || 'Giao hàng', shippingAddress, customerId, voucherId || null]
        );
        const orderId = orderResult.insertId;

        // 5. Thêm chi tiết món
        for (const item of processedItems) {
            let dbProductId = item.productId;
            if (item.isStandaloneTopping) {
                dbProductId = null; // Hoặc lưu âm tùy thuộc vào bạn quy định ProductID cho topping lẻ
            }
            
            const [itemResult] = await connection.query(
                'INSERT INTO OrderItems (OrderID, ProductID, SugarLevel, IceLevel, Quantity, SubTotal) VALUES (?, ?, ?, ?, ?, ?)',
                [orderId, dbProductId, item.sugarLevel, item.iceLevel, item.quantity, item.subTotal]
            );
            const orderItemId = itemResult.insertId;

            // Thêm topping nếu có
            if (item.toppings && item.toppings.length > 0) {
                for (const t of item.toppings) {
                    await connection.query(
                        'INSERT INTO OrderItemToppings (OrderItemID, ToppingID, PriceAtOrder) VALUES (?, ?, ?)',
                        [orderItemId, t.toppingId, t.price]
                    );
                }
            }
        }

        await connection.commit();
        res.status(201).json({ success: true, message: 'Đặt hàng thành công', orderId });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Online order error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đặt hàng' });
    } finally {
        if (connection) connection.release();
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const customerId = req.headers['customer-id'];
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const [rows] = await db.query('SELECT * FROM Orders WHERE CustomerID = ? ORDER BY CreatedDate DESC', [customerId]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.getMyOrderDetails = async (req, res) => {
    try {
        const customerId = req.headers['customer-id'];
        const orderId = req.params.id;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const [orders] = await db.query('SELECT * FROM Orders WHERE OrderID = ? AND CustomerID = ?', [orderId, customerId]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        
        const order = orders[0];

        const [items] = await db.query(`
            SELECT oi.*, p.ProductName, p.BasePrice 
            FROM OrderItems oi
            LEFT JOIN Products p ON oi.ProductID = p.ProductID
            WHERE oi.OrderID = ?
        `, [orderId]);

        for (let item of items) {
            // Check if it's a standalone topping (ProductID is null or we can check logic)
            if (item.ProductID === null) {
                // To find which topping it is, we look at OrderItemToppings since the topping itself is saved there
                const [toppings] = await db.query(`
                    SELECT oit.*, t.ToppingName, oit.PriceAtOrder as Price
                    FROM OrderItemToppings oit
                    JOIN Toppings t ON oit.ToppingID = t.ToppingID
                    WHERE oit.OrderItemID = ?
                `, [item.OrderItemID]);
                
                if (toppings.length > 0) {
                    item.ProductName = toppings[0].ToppingName;
                    item.BasePrice = toppings[0].Price;
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
        res.json({ success: true, data: order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.cancelMyOrder = async (req, res) => {
    try {
        const customerId = req.headers['customer-id'];
        const orderId = req.params.id;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const [orders] = await db.query("SELECT Status FROM Orders WHERE OrderID = ? AND CustomerID = ?", [orderId, customerId]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        
        const status = orders[0].Status;
        if (status !== 'PENDING' && status !== 'IN_PROGRESS') {
            return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng lúc này' });
        }

        await db.query("UPDATE Orders SET Status = 'CANCELLED' WHERE OrderID = ?", [orderId]);
        res.json({ success: true, message: 'Đã hủy đơn hàng' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.completeMyOrder = async (req, res) => {
    try {
        const customerId = req.headers['customer-id'];
        const orderId = req.params.id;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const [orders] = await db.query("SELECT Status FROM Orders WHERE OrderID = ? AND CustomerID = ?", [orderId, customerId]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        
        const status = orders[0].Status;
        if (status !== 'DELIVERING') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể xác nhận khi đơn hàng đang giao' });
        }

        await db.query("UPDATE Orders SET Status = 'COMPLETED' WHERE OrderID = ?", [orderId]);
        res.json({ success: true, message: 'Đã nhận hàng thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
