const db = require('../config/db');

exports.fixAdmins = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Kiểm tra xem admin 'abc' có tồn tại không
        const [existing] = await connection.query("SELECT UserID FROM Users WHERE Username = 'abc'");
        let abcUserId;
        
        if (existing.length > 0) {
            abcUserId = existing[0].UserID;
            // Cập nhật pass và đảm bảo role là admin
            await connection.query("UPDATE Users SET Password = '123', Role = 'admin', FullName = 'Admin' WHERE UserID = ?", [abcUserId]);
        } else {
            // Tạo mới admin 'abc'
            const [result] = await connection.query(
                "INSERT INTO Users (Username, Password, FullName, Role, Status) VALUES ('abc', '123', 'Admin', 'admin', 'active')"
            );
            abcUserId = result.insertId;
        }

        // 2. Chuyển tất cả Staff, Products, Orders của admin cũ sang cho admin 'abc'
        // (Trong hệ thống này, các bảng liên kết qua ManagerID hoặc UserID)
        await connection.query("UPDATE Users SET ManagerID = ? WHERE Role = 'staff'", [abcUserId]);
        await connection.query("UPDATE Orders SET UserID = ? WHERE UserID != ?", [abcUserId, abcUserId]);
        // Có thể Products/Toppings cũng lưu ManagerID/UserID, ta bỏ qua hoặc update nếu cần (tùy schema)

        // 3. Xóa các tài khoản admin/manager khác
        await connection.query("DELETE FROM Users WHERE (Role = 'admin' OR Role = 'manager') AND UserID != ?", [abcUserId]);

        await connection.commit();
        res.status(200).json({ success: true, message: 'Đã setup duy nhất 1 admin abc/123. Đã đồng bộ dữ liệu.', newAdminId: abcUserId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Fix admin error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) connection.release();
    }
};
