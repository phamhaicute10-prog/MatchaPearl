const pool = require('../config/db');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        const [rows] = await pool.query('SELECT UserID, Username, FullName, Phone, Email, Password, PayosClientId, PayosApiKey, PayosChecksumKey FROM Users WHERE Username = ? AND Password = ?', [username, password]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
        }

        // Return user info. In a real app, return a JWT token here.
        res.json({
            message: 'Đăng nhập thành công',
            user: rows[0]
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.register = async (req, res) => {
    try {
        const { username, password, fullName, phone, email } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }
        
        // Check if username exists
        const [existing] = await pool.query('SELECT UserID FROM Users WHERE Username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại' });
        }

        const [result] = await pool.query(
            'INSERT INTO Users (Username, Password, FullName, Phone, Email) VALUES (?, ?, ?, ?, ?)',
            [username, password, fullName || null, phone || null, email || null]
        );

        res.status(201).json({
            message: 'Đăng ký thành công',
            user: {
                UserID: result.insertId,
                Username: username,
                FullName: fullName,
                Phone: phone,
                Email: email
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage && error.sqlMessage.includes('Email')) {
                return res.status(409).json({ message: 'Email này đã được sử dụng. Vui lòng nhập Email khác.' });
            }
        }
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { userId, fullName, phone, email, password, payosClientId, payosApiKey, payosChecksumKey } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'Thiếu ID người dùng' });
        }

        let query = 'UPDATE Users SET FullName = ?, Phone = ?, Email = ?, PayosClientId = ?, PayosApiKey = ?, PayosChecksumKey = ?';
        let params = [fullName || null, phone || null, email || null, payosClientId || null, payosApiKey || null, payosChecksumKey || null];

        if (password) {
            query += ', Password = ?';
            params.push(password);
        }

        query += ' WHERE UserID = ?';
        params.push(userId);

        await pool.query(query, params);

        res.json({ message: 'Cập nhật thông tin thành công' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email' });
        }

        const [rows] = await pool.query('SELECT Username, Password FROM Users WHERE Email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
        }

        const user = rows[0];
        
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

        if (!scriptUrl) {
            console.log("Cảnh báo: Chưa cấu hình GOOGLE_SCRIPT_URL. Đang chạy chế độ mô phỏng Test.");
            return res.json({ message: 'Đây là môi trường Test. Hãy thiết lập GOOGLE_SCRIPT_URL trên Render để gửi email thực.' });
        }

        console.log("Bắt đầu gọi Google Apps Script API cho email:", email);
        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: email,
                subject: "Khôi phục mật khẩu - Matcha Pearl",
                html: `<p>Xin chào,</p><p>Bạn đã yêu cầu khôi phục mật khẩu cho hệ thống Matcha Pearl POS.</p><p>Tên đăng nhập: <b>${user.Username}</b></p><p>Mật khẩu: <b>${user.Password}</b></p><p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>`
            })
        });

        const result = await response.json();
        
        if (result.status === "success") {
            console.log("Email đã được Google gửi thành công!");
            return res.json({ message: 'Đã gửi thông tin tài khoản và mật khẩu vào email của bạn!' });
        } else {
            console.error("Google Apps Script báo lỗi:", result.message);
            return res.status(500).json({ message: 'Không thể gửi email từ Google Server' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
