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

    try {
        console.log('Adding Role column to Users...');
        await pool.query("ALTER TABLE Users ADD COLUMN Role VARCHAR(20) DEFAULT 'admin'");
    } catch(e) { console.log('Role column error:', e.message); }

    try {
        console.log('Adding ManagerID column to Users...');
        await pool.query('ALTER TABLE Users ADD COLUMN ManagerID INT NULL');
    } catch(e) { console.log('ManagerID column error:', e.message); }

    try {
        await pool.query('ALTER TABLE Users ADD COLUMN PayosClientId VARCHAR(255) NULL');
    } catch(e) { console.log('PayosClientId error:', e.message); }

    try {
        await pool.query('ALTER TABLE Users ADD COLUMN PayosApiKey VARCHAR(255) NULL');
    } catch(e) { console.log('PayosApiKey error:', e.message); }

    try {
        await pool.query('ALTER TABLE Users ADD COLUMN PayosChecksumKey VARCHAR(255) NULL');
    } catch(e) { console.log('PayosChecksumKey error:', e.message); }

    try {
        await pool.query('ALTER TABLE Users ADD COLUMN Avatar VARCHAR(255) NULL');
    } catch(e) { console.log('Avatar error:', e.message); }

    try {
        await pool.query('ALTER TABLE Users ADD COLUMN Email VARCHAR(100) NULL UNIQUE');
    } catch(e) { console.log('Email error:', e.message); }

    try {
        await pool.query("ALTER TABLE Users ADD COLUMN Status VARCHAR(20) DEFAULT 'active'");
    } catch(e) { console.log('Status error:', e.message); }

    try {
        console.log('Updating abc to admin and changing password...');
        // Đổi tên admin cũ thành admin_old để nhường chỗ
        await pool.query("UPDATE Users SET Username = 'admin_old' WHERE Username = 'admin'");
        
        // Đổi tên abc thành admin và cập nhật mật khẩu
        await pool.query("UPDATE Users SET Username = 'admin', Password = 'Quanly@2004' WHERE Username = 'abc'");
        
        // Cập nhật lại mật khẩu cho chắc chắn nếu abc đã đổi thành admin từ trước
        await pool.query("UPDATE Users SET Password = 'Quanly@2004' WHERE Username = 'admin'");
    } catch(e) { console.log('Update admin error:', e.message); }

    try {
        console.log('Creating Shifts table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Shifts (
                ShiftID INT AUTO_INCREMENT PRIMARY KEY,
                UserID INT NOT NULL,
                ManagerID INT NOT NULL,
                StartTime DATETIME NOT NULL,
                EndTime DATETIME NULL,
                StartingCash DECIMAL(12,2) DEFAULT 0,
                EndingCash DECIMAL(12,2) NULL,
                SystemCash DECIMAL(12,2) NULL,
                TotalRevenue DECIMAL(12,2) DEFAULT 0,
                Note TEXT NULL,
                Status VARCHAR(20) DEFAULT 'OPEN'
            )
        `);
    } catch(e) { console.log(e.message); }

    try {
        console.log('Creating Ingredients table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Ingredients (
                IngredientID INT AUTO_INCREMENT PRIMARY KEY,
                Name VARCHAR(100) NOT NULL,
                Unit VARCHAR(20) NOT NULL,
                CurrentStock DECIMAL(12,2) DEFAULT 0,
                MinStockLevel DECIMAL(12,2) DEFAULT 0,
                ManagerID INT NOT NULL,
                Status INT DEFAULT 1
            )
        `);
    } catch(e) { console.log(e.message); }

    try {
        console.log('Adding BasePrice column to Ingredients...');
        await pool.query('ALTER TABLE Ingredients ADD COLUMN BasePrice DECIMAL(12,2) DEFAULT 0');
    } catch(e) { console.log('BasePrice column error:', e.message); }

    try {
        console.log('Creating Recipes table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Recipes (
                RecipeID INT AUTO_INCREMENT PRIMARY KEY,
                ProductID INT NULL,
                ToppingID INT NULL,
                IngredientID INT NOT NULL,
                Amount DECIMAL(10,2) NOT NULL,
                ManagerID INT NOT NULL
            )
        `);
    } catch(e) { console.log(e.message); }

    try {
        console.log('Creating InventoryLogs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS InventoryLogs (
                LogID INT AUTO_INCREMENT PRIMARY KEY,
                IngredientID INT NOT NULL,
                ChangeAmount DECIMAL(12,2) NOT NULL,
                Type VARCHAR(50) NOT NULL,
                ReferenceID VARCHAR(50) NULL,
                ManagerID INT NOT NULL,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                CreatedBy INT NOT NULL
            )
        `);
    } catch(e) { console.log(e.message); }

    try {
        console.log('Adding ShiftID and CreatedBy to Orders...');
        await pool.query('ALTER TABLE Orders ADD COLUMN ShiftID INT NULL');
        await pool.query('ALTER TABLE Orders ADD COLUMN CreatedBy INT NULL');
    } catch(e) { console.log('Orders columns error:', e.message); }

    await pool.end();
    console.log('Database schema update finished.');
}

module.exports = updateSchema;
