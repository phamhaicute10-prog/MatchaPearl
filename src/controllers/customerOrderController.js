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

        // 4. Tạo Order
        const [orderResult] = await connection.query(
            `INSERT INTO Orders (ManagerID, UserID, ShiftID, TotalAmount, FinalAmount, ShippingFee, PaymentMethod, OrderType, ShippingAddress, Status, CustomerID, VoucherID) 
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
            [managerId, managerId, finalTotalAmount, totalPay, shippingFee, paymentMethod || 'COD', orderType || 'Giao hàng', shippingAddress, customerId, voucherId || null]
        );
        const orderId = orderResult.insertId;

        // 5. Thêm chi tiết món
        for (const item of processedItems) {
            if (item.isStandaloneTopping) {
                const toppingId = -item.productId - 1000; // Phục hồi lại ID như logic cũ
                await connection.query(
                    'INSERT INTO OrderDetails (OrderID, ProductID, SugarLevel, IceLevel, Quantity, SubTotal, IsStandaloneTopping) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [orderId, toppingId, item.sugarLevel, item.iceLevel, item.quantity, item.subTotal, true]
                );
            } else {
                const [detailResult] = await connection.query(
                    'INSERT INTO OrderDetails (OrderID, ProductID, SugarLevel, IceLevel, Quantity, SubTotal, IsStandaloneTopping) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [orderId, item.productId, item.sugarLevel, item.iceLevel, item.quantity, item.subTotal, false]
                );
                const orderDetailId = detailResult.insertId;

                // Thêm topping nếu có
                if (item.toppings && item.toppings.length > 0) {
                    for (const t of item.toppings) {
                        await connection.query(
                            'INSERT INTO OrderToppings (OrderDetailID, ToppingID, Quantity, Price) VALUES (?, ?, 1, ?)',
                            [orderDetailId, t.toppingId, t.price]
                        );
                    }
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
