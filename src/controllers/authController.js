const pool = require('../config/db');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        const [rows] = await pool.query('SELECT UserID, Username, FullName FROM Users WHERE Username = ? AND Password = ?', [username, password]);
        
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
