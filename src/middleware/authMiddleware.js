const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'matchapearl_secret_key';

const verifyToken = async (req, res, next) => {
    // Các đường dẫn được phép truy cập không cần token
    const publicPaths = [
        '/api/login',
        '/api/register',
        '/api/forgot-password',
        '/api/customers/auth/login',
        '/api/customers/auth/register',
        '/api/customers/auth/forgot-password',
        '/api/customers/categories',
        '/api/customers/products',
        '/api/customers/toppings',
        '/api/news'
    ];

    if (publicPaths.some(p => req.path.startsWith(p))) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Không tìm thấy token xác thực' });
    }

    const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"
    if (!token) {
        return res.status(401).json({ success: false, message: 'Thi?u token xac th?c' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Kiểm tra Single Session cho Admin / Staff
        if (decoded.sessionId && decoded.staffId) {
            const [rows] = await pool.query('SELECT CurrentSessionId FROM Users WHERE UserID = ?', [decoded.staffId]);
            if (rows.length > 0 && rows[0].CurrentSessionId !== decoded.sessionId) {
                return res.status(401).json({ success: false, message: 'Tài khoản của bạn đã được đăng nhập ở thiết bị khác' });
            }
        }

        // Gán thông tin từ token vào request
        if (decoded.userId) req.userId = decoded.userId;
        if (decoded.staffId) req.staffId = decoded.staffId;
        if (decoded.role) req.role = decoded.role;
        if (decoded.customerId) req.customerId = decoded.customerId;
        
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token không h?p l? ho?c ?ã h?t h?n' });
    }
};

module.exports = { verifyToken, JWT_SECRET };
