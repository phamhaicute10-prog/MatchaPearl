const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'matcha_pearl_db',
        ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') ? { rejectUnauthorized: false } : null
    });

    console.log('--- Bắt đầu cập nhật cơ sở dữ liệu ---');

    // 1. Nâng cấp bảng Customers
    console.log('1. Cập nhật bảng Customers...');
    const customerColumns = [
        'ALTER TABLE Customers ADD COLUMN Email VARCHAR(100) NULL',
        'ALTER TABLE Customers ADD COLUMN PasswordHash VARCHAR(255) NULL',
        'ALTER TABLE Customers ADD COLUMN ExternalID VARCHAR(100) NULL',
        'ALTER TABLE Customers ADD COLUMN MembershipLevel VARCHAR(50) DEFAULT "Đồng"',
        'ALTER TABLE Customers ADD COLUMN Birthday DATE NULL',
        'ALTER TABLE Customers ADD COLUMN Gender VARCHAR(10) NULL'
    ];
    for (const q of customerColumns) {
        try {
            await pool.query(q);
            console.log(` - Chạy thành công: ${q}`);
        } catch(e) { console.log(` - Bỏ qua (Đã tồn tại): ${q.split('ADD COLUMN ')[1]}`); }
    }

    // 2. Nâng cấp bảng Orders
    console.log('2. Cập nhật bảng Orders...');
    const orderColumns = [
        'ALTER TABLE Orders ADD COLUMN DiscountAmount DECIMAL(10,2) DEFAULT 0',
        'ALTER TABLE Orders ADD COLUMN ShippingFee DECIMAL(10,2) DEFAULT 0',
        'ALTER TABLE Orders ADD COLUMN FinalAmount DECIMAL(10,2) DEFAULT 0',
        'ALTER TABLE Orders ADD COLUMN PaymentMethod VARCHAR(50) NULL',
        'ALTER TABLE Orders ADD COLUMN OrderType VARCHAR(50) DEFAULT "Tại chỗ"',
        'ALTER TABLE Orders ADD COLUMN ShippingAddress VARCHAR(255) NULL',
        'ALTER TABLE Orders ADD COLUMN VoucherID INT NULL'
    ];
    for (const q of orderColumns) {
        try {
            await pool.query(q);
            console.log(` - Chạy thành công: ${q}`);
        } catch(e) { console.log(` - Bỏ qua (Đã tồn tại): ${q.split('ADD COLUMN ')[1]}`); }
    }

    // 3. Tạo bảng PointHistory
    console.log('3. Tạo bảng PointHistory...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS PointHistory (
                PointHistoryID INT AUTO_INCREMENT PRIMARY KEY,
                CustomerID INT NOT NULL,
                OrderID INT NULL,
                PointsChange DECIMAL(10,2) NOT NULL,
                Type VARCHAR(50) NOT NULL, -- "Tích điểm", "Tiêu điểm", "Đổi quà"
                Reason VARCHAR(255) NULL,
                CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
            )
        `);
        console.log(' - Đã tạo PointHistory');
    } catch(e) { console.log('Lỗi PointHistory:', e.message); }

    // 4. Tạo bảng Vouchers và CustomerVouchers
    console.log('4. Tạo bảng Vouchers & CustomerVouchers...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Vouchers (
                VoucherID INT AUTO_INCREMENT PRIMARY KEY,
                Code VARCHAR(50) NOT NULL UNIQUE,
                Title VARCHAR(255) NOT NULL,
                DiscountValue DECIMAL(10,2) NOT NULL,
                DiscountType VARCHAR(20) NOT NULL, -- "Tiền mặt", "Phần trăm"
                MinOrderValue DECIMAL(10,2) DEFAULT 0,
                MaxDiscountValue DECIMAL(10,2) NULL,
                ExpiryDate DATETIME NULL,
                PointsRequired INT DEFAULT 0, -- Số điểm cần để đổi
                IsActive BOOLEAN DEFAULT TRUE,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log(' - Đã tạo Vouchers');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS CustomerVouchers (
                CustomerVoucherID INT AUTO_INCREMENT PRIMARY KEY,
                CustomerID INT NOT NULL,
                VoucherID INT NOT NULL,
                ReceivedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                UsedDate DATETIME NULL,
                Status VARCHAR(50) DEFAULT "Chưa dùng", -- "Chưa dùng", "Đã dùng", "Hết hạn"
                FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
                FOREIGN KEY (VoucherID) REFERENCES Vouchers(VoucherID) ON DELETE CASCADE
            )
        `);
        console.log(' - Đã tạo CustomerVouchers');
    } catch(e) { console.log('Lỗi Vouchers:', e.message); }

    // 5. Tạo bảng Reviews và News
    console.log('5. Tạo bảng Reviews & News...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Reviews (
                ReviewID INT AUTO_INCREMENT PRIMARY KEY,
                CustomerID INT NOT NULL,
                OrderID INT NULL,
                ProductID INT NULL,
                Rating INT NOT NULL CHECK(Rating BETWEEN 1 AND 5),
                Comment TEXT NULL,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
            )
        `);
        console.log(' - Đã tạo Reviews');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS News (
                NewsID INT AUTO_INCREMENT PRIMARY KEY,
                Title VARCHAR(255) NOT NULL,
                Content TEXT NOT NULL,
                Type VARCHAR(50) DEFAULT "Tin tức", -- "Tin tức", "Khuyến mãi"
                ImageURL VARCHAR(255) NULL,
                PublishedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                Status VARCHAR(50) DEFAULT "Hiển thị"
            )
        `);
        console.log(' - Đã tạo News');
    } catch(e) { console.log('Lỗi Reviews/News:', e.message); }

    console.log('--- Cập nhật hoàn tất ---');
}

updateSchema();
