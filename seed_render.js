const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

const RENDER_API = 'https://matchapearl.onrender.com/api';

async function migrateData() {
    console.log('Bắt đầu đồng bộ dữ liệu từ Localhost lên Render...');
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'matcha_pearl_db'
    });

    try {
        // 1. Đăng ký tài khoản Admin mặc định trên Render
        console.log('1. Đăng ký tài khoản Admin trên Render...');
        let adminToken = '';
        let adminId = 1;
        try {
            const res = await axios.post(`${RENDER_API}/register`, {
                username: 'admin',
                password: 'adminpassword',
                fullName: 'Chủ Quán',
                phone: '0123456789',
                email: 'admin@gmail.com'
            });
            console.log('Tạo Admin thành công!');
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('Admin đã tồn tại, tiến hành đăng nhập...');
            } else {
                console.error('Lỗi tạo Admin:', e.response ? e.response.data : e.message);
            }
        }
        
        // Đăng nhập để lấy thông tin
        const loginRes = await axios.post(`${RENDER_API}/login`, {
            username: 'admin',
            password: 'adminpassword'
        });
        adminId = loginRes.data.user.UserID;

        // 2. Lấy danh mục từ Local và đẩy lên Render
        console.log('2. Đồng bộ Danh mục...');
        const [categories] = await pool.query('SELECT * FROM Categories WHERE UserID = 1');
        const categoryMap = {}; // Map local ID to remote ID
        for (const cat of categories) {
            try {
                // Ta có thể thêm danh mục bằng cách gửi yêu cầu lên API (Nhưng API hiện tại không có POST /categories)
                // Wait! apiRoutes.js không có POST /categories! Nó được tạo qua code?
            } catch(e) {}
        }
        
        // Wait, since I don't have POST /categories or POST /products that take IDs... it's easier to just do direct SQL queries on the remote DB if I have the config! But I don't have the config.
        
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}

migrateData();
