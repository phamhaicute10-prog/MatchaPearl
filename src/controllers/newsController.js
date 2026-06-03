const pool = require('../config/db');

exports.getNews = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM News WHERE Status = \'Hiển thị\' ORDER BY PublishedDate DESC');
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Get news error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
