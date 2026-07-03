const pool = require('../config/db');

class NewsModel {
    static async getNews() {
        const [rows] = await pool.query('SELECT * FROM News WHERE Status = \'Hiển thị\' ORDER BY PublishedDate DESC');
        return rows;
    }
}

module.exports = NewsModel;
