const pool = require('../config/db');

exports.register = async (req, res) => {
    try {
        const { fullName, phone, email, password } = req.body;
        
        if (!fullName || !phone || !email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        // Kiểm tra số điện thoại hoặc email đã tồn tại trong bảng Customers chưa
        const [existing] = await pool.query('SELECT CustomerID FROM Customers WHERE Phone = ? OR Email = ?', [phone, email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Số điện thoại hoặc Email đã được sử dụng' });
        }

        // Kiểm tra xem email có thuộc về tài khoản Nhân viên/Admin không
        const [existingUser] = await pool.query('SELECT UserID FROM Users WHERE Email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ success: false, message: 'Email này đã được sử dụng cho tài khoản nội bộ. Vui lòng dùng email khác.' });
        }

        // Tạm thời lấy ManagerID đầu tiên làm mặc định (vì chuỗi 1 cửa hàng)
        const [managers] = await pool.query("SELECT UserID FROM Users WHERE Role = 'admin' OR Role = 'manager' LIMIT 1");
        const managerId = managers.length > 0 ? managers[0].UserID : 0;

        const [result] = await pool.query(
            "INSERT INTO Customers (ManagerID, FullName, Phone, Email, PasswordHash, TotalPoints, MembershipLevel) VALUES (?, ?, ?, ?, ?, 0, 'Đồng')",
            [managerId, fullName, phone, email, password] // Lưu plain text tạm thời
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            customer: {
                CustomerID: result.insertId,
                FullName: fullName,
                Phone: phone,
                Email: email,
                MembershipLevel: 'Đồng'
            }
        });
    } catch (err) {
        console.error('Customer register error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
        }

        const [rows] = await pool.query(
            `SELECT CustomerID, FullName, Phone, Email, TotalPoints, 
                    CASE 
                        WHEN TotalPoints >= 60 THEN 'Vàng'
                        WHEN TotalPoints >= 30 THEN 'Bạc'
                        ELSE 'Đồng'
                    END AS MembershipLevel, 
                    Birthday, Gender 
             FROM Customers WHERE Email = ? AND PasswordHash = ?`,
            [email, password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
        }

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            customer: rows[0]
        });
    } catch (err) {
        console.error('Customer login error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.getMe = async (req, res) => {
    try {
        // Trong thực tế sẽ lấy từ JWT token, ở đây dùng query/param tạm
        const customerId = req.query.customerId || req.headers['customer-id'];
        
        if (!customerId) {
            return res.status(401).json({ success: false, message: 'Chưa xác thực' });
        }

        const [rows] = await pool.query(
            `SELECT CustomerID, FullName, Phone, Email, TotalPoints, 
                    CASE 
                        WHEN TotalPoints >= 60 THEN 'Vàng'
                        WHEN TotalPoints >= 30 THEN 'Bạc'
                        ELSE 'Đồng'
                    END AS MembershipLevel, 
                    Birthday, Gender 
             FROM Customers WHERE CustomerID = ?`,
            [customerId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        }

        res.json({
            success: true,
            customer: rows[0]
        });
    } catch (err) {
        console.error('Get me error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.updateMe = async (req, res) => {
    try {
        const customerId = req.headers['customer-id'];
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const { fullName, phone, email } = req.body;
        if (!fullName || !phone) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đủ họ tên và số điện thoại' });
        }

        // Kiểm tra email hoặc sđt bị trùng với khách hàng KHÁC không
        if (email) {
            const [existing] = await pool.query('SELECT CustomerID FROM Customers WHERE (Phone = ? OR Email = ?) AND CustomerID != ?', [phone, email, customerId]);
            if (existing.length > 0) {
                return res.status(409).json({ success: false, message: 'Số điện thoại hoặc Email đã được sử dụng bởi người khác' });
            }
        } else {
            const [existing] = await pool.query('SELECT CustomerID FROM Customers WHERE Phone = ? AND CustomerID != ?', [phone, customerId]);
            if (existing.length > 0) {
                return res.status(409).json({ success: false, message: 'Số điện thoại đã được sử dụng bởi người khác' });
            }
        }

        await pool.query('UPDATE Customers SET FullName = ?, Phone = ?, Email = ? WHERE CustomerID = ?', [fullName, phone, email, customerId]);

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('Update me error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const customerId = req.headers['customer-id'];
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu cũ và mới' });
        }

        const [rows] = await pool.query('SELECT PasswordHash FROM Customers WHERE CustomerID = ?', [customerId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }

        const currentPassword = rows[0].PasswordHash;
        if (currentPassword !== oldPassword) {
            return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
        }

        await pool.query('UPDATE Customers SET PasswordHash = ? WHERE CustomerID = ?', [newPassword, customerId]);

        res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ email' });
        }

        const [rows] = await pool.query('SELECT PasswordHash FROM Customers WHERE Email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống' });
        }

        const customer = rows[0];
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

        if (!scriptUrl) {
            console.log("Cảnh báo: Chưa cấu hình GOOGLE_SCRIPT_URL.");
            return res.json({ success: true, message: 'Đây là môi trường Test. Cần cấu hình GOOGLE_SCRIPT_URL trên Render.' });
        }

        console.log("Bắt đầu gọi Google Apps Script API cho email khách hàng:", email);
        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: email,
                subject: "Khôi phục mật khẩu - Matcha Pearl App",
                html: `<p>Xin chào,</p><p>Bạn đã yêu cầu khôi phục mật khẩu cho ứng dụng <b>Matcha Pearl App</b>.</p><p>Mật khẩu hiện tại của bạn là: <b>${customer.PasswordHash}</b></p><p>Vui lòng đăng nhập bằng mật khẩu này và đổi mật khẩu mới để bảo vệ tài khoản.</p>`
            })
        });

        const result = await response.json();
        
        if (result.status === "success") {
            console.log("Email đã được gửi thành công!");
            return res.json({ success: true, message: 'Mật khẩu đã được gửi vào email của bạn!' });
        } else {
            console.error("Google Apps Script báo lỗi:", result.message);
            return res.status(500).json({ success: false, message: 'Không thể gửi email từ hệ thống' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
