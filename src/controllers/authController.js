const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/authMiddleware');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        const [rows] = await pool.query('SELECT UserID, Username, FullName, Phone, Email, Password, PayosClientId, PayosApiKey, PayosChecksumKey, Avatar, Role, ManagerID, Status FROM Users WHERE Username = ?', [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
        }

        const user = rows[0];
        let isMatch = false;

        if (user.Password.startsWith('$2b$') || user.Password.startsWith('$2a$')) {
            isMatch = await bcrypt.compare(password, user.Password);
        } else {
            // Lazy migration: Fallback to plain text
            isMatch = (password === user.Password);
            if (isMatch) {
                // Mật khẩu đúng, băm lại và lưu vào DB
                const hashedPwd = await bcrypt.hash(password, 10);
                await pool.query('UPDATE Users SET Password = ? WHERE UserID = ?', [hashedPwd, user.UserID]);
            }
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
        }

        if (user.Status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị vô hiệu hóa hoặc ngừng hoạt động.' });
        }

        const resolvedUserId = (user.Role === 'staff' && user.ManagerID) ? user.ManagerID : user.UserID;
        const sessionId = crypto.randomUUID();

        const token = jwt.sign(
            { userId: resolvedUserId, staffId: user.UserID, role: user.Role, sessionId: sessionId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        await pool.query('UPDATE Users SET CurrentSessionId = ? WHERE UserID = ?', [sessionId, user.UserID]);

        res.json({
            message: 'Đăng nhập thành công',
            user: { ...user, Password: undefined },
            token: token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.staffId || req.userId;
        if (userId) {
            await pool.query('UPDATE Users SET CurrentSessionId = NULL WHERE UserID = ?', [userId]);
        }
        res.json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng xuất' });
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

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO Users (Username, Password, FullName, Phone, Email) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, fullName || null, phone || null, email || null]
        );

        res.status(201).json({
            message: 'Đăng ký thành công',
            user: {
                UserID: result.insertId,
                Username: username,
                FullName: fullName,
                Phone: phone,
                Email: email,
                Avatar: null
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
        const { userId, fullName, phone, email, payosClientId, payosApiKey, payosChecksumKey } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'Thiếu ID người dùng' });
        }

        let query = 'UPDATE Users SET FullName = ?, Phone = ?, Email = ?, PayosClientId = ?, PayosApiKey = ?, PayosChecksumKey = ?';
        let params = [fullName || null, phone || null, email || null, payosClientId || null, payosApiKey || null, payosChecksumKey || null];

        if (req.file) {
            query += ', Avatar = ?';
            params.push(`/uploads/${req.file.filename}`);
        }

        query += ' WHERE UserID = ?';
        params.push(userId);

        await pool.query(query, params);
        
        let avatarUrl = null;
        if (req.file) {
            avatarUrl = `/uploads/${req.file.filename}`;
        }

        res.json({ message: 'Cập nhật thông tin thành công', avatarUrl: avatarUrl });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        
        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Verify old password
        const [rows] = await pool.query('SELECT UserID FROM Users WHERE UserID = ? AND Password = ?', [userId, oldPassword]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Mật khẩu cũ không chính xác' });
        }

        // Update to new password
        await pool.query('UPDATE Users SET Password = ? WHERE UserID = ?', [newPassword, userId]);

        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email' });
        }

        const [rows] = await pool.query('SELECT UserID, Username FROM Users WHERE Email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
        }

        const user = rows[0];
        
        const newPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE Users SET Password = ? WHERE UserID = ?', [hashedPassword, user.UserID]);

        
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
                html: `<p>Xin chào,</p><p>Bạn đã yêu cầu khôi phục mật khẩu cho hệ thống Matcha Pearl POS.</p><p>Tên đăng nhập: <b>${user.Username}</b></p><p>Mật khẩu mới của bạn là: <b>${newPassword}</b></p><p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>`
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
