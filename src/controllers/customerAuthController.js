const pool = require('../config/db');

exports.register = async (req, res) => {
    try {
        const { fullName, phone, email, password } = req.body;
        
        if (!fullName || !phone || !email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        // Kiểm tra số điện thoại hoặc email đã tồn tại chưa
        const [existing] = await pool.query('SELECT CustomerID FROM Customers WHERE Phone = ? OR Email = ?', [phone, email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Số điện thoại hoặc Email đã được sử dụng' });
        }

        // Tạm thời lấy ManagerID đầu tiên làm mặc định (vì chuỗi 1 cửa hàng)
        const [managers] = await pool.query('SELECT UserID FROM Users WHERE Role = "admin" OR Role = "manager" LIMIT 1');
        const managerId = managers.length > 0 ? managers[0].UserID : 0;

        const [result] = await pool.query(
            'INSERT INTO Customers (ManagerID, FullName, Phone, Email, PasswordHash, TotalPoints, MembershipLevel) VALUES (?, ?, ?, ?, ?, 0, "Đồng")',
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
            'SELECT CustomerID, FullName, Phone, Email, TotalPoints, MembershipLevel, Birthday, Gender FROM Customers WHERE Email = ? AND PasswordHash = ?',
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
            'SELECT CustomerID, FullName, Phone, Email, TotalPoints, MembershipLevel, Birthday, Gender FROM Customers WHERE CustomerID = ?',
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
