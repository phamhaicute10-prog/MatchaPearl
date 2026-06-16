const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'matchapearl_secret_key';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // N?u không có header Authorization, th? ki?m tra theo header c? ?? backward compatibility
    // (Trong tr??ng h?p App ch?a k?p c?p nh?t)
    if (!authHeader) {
        const legacyUserId = req.headers['user-id'];
        const legacyStaffId = req.headers['staff-id'];
        const legacyCustomerId = req.headers['customer-id'];
        
        if (legacyUserId) req.userId = parseInt(legacyUserId, 10);
        if (legacyStaffId) req.staffId = parseInt(legacyStaffId, 10);
        if (legacyCustomerId) req.customerId = parseInt(legacyCustomerId, 10);
        
        return next();
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
