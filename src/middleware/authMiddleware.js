const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'matchapearl_secret_key';

const verifyToken = (req, res, next) => {
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
        // Gán thông tin t? token vào request
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
