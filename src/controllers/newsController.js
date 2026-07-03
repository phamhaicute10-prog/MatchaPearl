const NewsModel = require('../models/newsModel');

exports.getNews = async (req, res) => {
    try {
        const rows = await NewsModel.getNews();
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Get news error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
