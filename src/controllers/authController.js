const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const AuthModel = require('../models/authModel');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        const user = await AuthModel.getUserByUsername(username);
        
        if (!user) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
        }

        let isMatch = false;

        if (user.Password.startsWith('$2b$') || user.Password.startsWith('$2a$')) {
            isMatch = await bcrypt.compare(password, user.Password);
        } else {
            // Lazy migration: Fallback to plain text
            isMatch = (password === user.Password);
            if (isMatch) {
                const hashedPwd = await bcrypt.hash(password, 10);
                await AuthModel.updatePassword(user.UserID, hashedPwd);
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

        await AuthModel.updateSessionId(user.UserID, sessionId);

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
            await AuthModel.clearSessionId(userId);
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
        
        const exists = await AuthModel.checkUsernameExists(username);
        if (exists) {
            return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertId = await AuthModel.createUser({
            username, hashedPassword, fullName, phone, email
        });

        res.status(201).json({
            message: 'Đăng ký thành công',
            user: {
                UserID: insertId,
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

        let avatarUrl = null;
        if (req.file) {
            avatarUrl = `/uploads/${req.file.filename}`;
        }

        await AuthModel.updateProfile({
            userId, fullName, phone, email, payosClientId, payosApiKey, payosChecksumKey, avatarUrl
        });

        res.json({ message: 'Cập nhật thông tin thành công', avatarUrl: avatarUrl });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        let { userId, oldPassword, newPassword } = req.body;
        
        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
        }

        oldPassword = oldPassword.trim();
        newPassword = newPassword.trim();

        const dbPassword = await AuthModel.getUserPassword(userId);
        
        if (!dbPassword) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        const isMatch = await bcrypt.compare(oldPassword, dbPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await AuthModel.updatePassword(userId, hashedNewPassword);

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

        const user = await AuthModel.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
        }

        const newPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await AuthModel.updatePassword(user.UserID, hashedPassword);
        
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
