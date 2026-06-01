const pool = require('../config/db');
const nodemailer = require('nodemailer');
const dns = require('dns');

// Fix cho lỗi Render cố gắng dùng IPv6 kết nối Gmail
dns.setDefaultResultOrder('ipv4first');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        const [rows] = await pool.query('SELECT UserID, Username, FullName, Phone, Email, Password FROM Users WHERE Username = ? AND Password = ?', [username, password]);
        
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
        const { userId, fullName, phone, email, password } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'Thiếu ID người dùng' });
        }

        let query = 'UPDATE Users SET FullName = ?, Phone = ?, Email = ?';
        let params = [fullName || null, phone || null, email || null];

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
        
        let transporter;
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            console.log("Bắt đầu cấu hình Gmail SMTP cho:", process.env.EMAIL_USER);
            transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                requireTLS: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000
            });
        } else {
            console.log("Không tìm thấy cấu hình Email, dùng Ethereal...");
            let testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, 
                auth: {
                    user: testAccount.user, 
                    pass: testAccount.pass, 
                },
            });
        }

        console.log("Đang thực hiện gửi email tới:", email);
        let info = await transporter.sendMail({
            from: '"Matcha Pearl POS" <noreply@matchapearl.com>',
            to: email,
            subject: "Khôi phục mật khẩu - Matcha Pearl",
            html: `<p>Xin chào,</p><p>Bạn đã yêu cầu khôi phục mật khẩu cho hệ thống Matcha Pearl POS.</p><p>Tên đăng nhập: <b>${user.Username}</b></p><p>Mật khẩu: <b>${user.Password}</b></p><p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>`,
        });
        console.log("Email đã gửi thành công:", info.messageId);

        if (!process.env.EMAIL_USER) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
            return res.json({ message: 'Đây là môi trường Test. Hãy kiểm tra màn hình Terminal (Console) Backend để bấm vào link xem email.' });
        }

        res.json({ message: 'Đã gửi thông tin tài khoản và mật khẩu vào email của bạn!' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
