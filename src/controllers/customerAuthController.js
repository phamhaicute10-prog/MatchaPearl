const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const CustomerAuthModel = require('../models/customerAuthModel');

exports.register = async (req, res) => {
    try {
        const { fullName, phone, email, password } = req.body;
        
        if (!fullName || !phone || !email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        const phoneOrEmailExists = await CustomerAuthModel.checkPhoneOrEmailExists(phone, email);
        if (phoneOrEmailExists) {
            return res.status(409).json({ success: false, message: 'Số điện thoại hoặc Email đã được sử dụng' });
        }

        const emailInUsers = await CustomerAuthModel.checkEmailInUsers(email);
        if (emailInUsers) {
            return res.status(409).json({ success: false, message: 'Email này đã được sử dụng cho tài khoản nội bộ. Vui lòng dùng email khác.' });
        }

        const managerId = await CustomerAuthModel.getFirstAdminManagerId();
        const hashedPassword = await bcrypt.hash(password, 10);

        const customerId = await CustomerAuthModel.createCustomer({
            managerId, fullName, phone, email, hashedPassword
        });

        const sessionId = crypto.randomUUID();

        const token = jwt.sign(
            { customerId: customerId, role: 'customer', sessionId: sessionId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        await CustomerAuthModel.updateSessionId(customerId, sessionId);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            customer: {
                CustomerID: customerId,
                FullName: fullName,
                Phone: phone,
                Email: email,
                MembershipLevel: 'Đồng'
            },
            token: token
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

        const customer = await CustomerAuthModel.getCustomerByEmail(email);

        if (!customer) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
        }

        let isMatch = false;

        if (customer.PasswordHash && (customer.PasswordHash.startsWith('$2b$') || customer.PasswordHash.startsWith('$2a$'))) {
            isMatch = await bcrypt.compare(password, customer.PasswordHash);
        } else {
            // Lazy migration: Fallback to plain text
            isMatch = (password === customer.PasswordHash);
            if (isMatch) {
                const hashedPwd = await bcrypt.hash(password, 10);
                await CustomerAuthModel.updatePassword(customer.CustomerID, hashedPwd);
            }
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
        }

        const sessionId = crypto.randomUUID();

        const token = jwt.sign(
            { customerId: customer.CustomerID, role: 'customer', sessionId: sessionId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        await CustomerAuthModel.updateSessionId(customer.CustomerID, sessionId);

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            customer: { ...customer, PasswordHash: undefined },
            token: token
        });
    } catch (err) {
        console.error('Customer login error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const customerId = req.customerId || req.customerId;
        
        if (!customerId) {
            return res.status(401).json({ success: false, message: 'Chưa xác thực' });
        }

        const customer = await CustomerAuthModel.getCustomerById(customerId);

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        }

        res.json({
            success: true,
            customer: customer
        });
    } catch (err) {
        console.error('Get me error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.updateMe = async (req, res) => {
    try {
        const customerId = req.customerId;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        const { fullName, phone, email } = req.body;
        if (!fullName || !phone) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đủ họ tên và số điện thoại' });
        }

        const exists = await CustomerAuthModel.checkOtherCustomerEmailPhone(phone, email, customerId);
        
        if (exists) {
            return res.status(409).json({ success: false, message: 'Số điện thoại hoặc Email đã được sử dụng bởi người khác' });
        }

        await CustomerAuthModel.updateProfile(customerId, fullName, phone, email);

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('Update me error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.logout = async (req, res) => {
    try {
        const customerId = req.customerId;
        if (customerId) {
            await CustomerAuthModel.clearSessionId(customerId);
        }
        res.json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error) {
        console.error('Customer logout error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng xuất' });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const customerId = req.customerId;
        if (!customerId) return res.status(401).json({ success: false, message: 'Chưa xác thực' });

        let { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu cũ và mới' });
        }
        
        oldPassword = oldPassword.trim();
        newPassword = newPassword.trim();

        const customer = await CustomerAuthModel.getCustomerById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Khách hàng không tồn tại' });
        }

        const currentPasswordHash = customer.PasswordHash;
        const isMatch = await bcrypt.compare(oldPassword, currentPasswordHash);
        
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await CustomerAuthModel.updatePassword(customerId, hashedNewPassword);

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

        const customer = await CustomerAuthModel.getCustomerByEmail(email);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống' });
        }

        const newPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await CustomerAuthModel.updatePassword(customer.CustomerID, hashedPassword);
        
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
                html: `<p>Xin chào,</p><p>Bạn đã yêu cầu khôi phục mật khẩu cho ứng dụng <b>Matcha Pearl App</b>.</p><p>Mật khẩu mới của bạn là: <b>${newPassword}</b></p><p>Vui lòng đăng nhập bằng mật khẩu này và đổi mật khẩu mới để bảo vệ tài khoản.</p>`
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

