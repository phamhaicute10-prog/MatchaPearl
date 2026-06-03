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
        console.log('Creating Customers table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Customers (
                CustomerID INT AUTO_INCREMENT PRIMARY KEY,
                ManagerID INT NOT NULL,
                FullName VARCHAR(100) NOT NULL,
                Phone VARCHAR(20) NOT NULL,
                TotalPoints DECIMAL(10,2) DEFAULT 0,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_phone_manager (Phone, ManagerID)
            )
        `);
        console.log('Customers table created.');
    } catch(e) { console.log('Customers table error:', e.message); }

    console.log('Adding point columns to Orders...');
    
    try {
        await pool.query('ALTER TABLE Orders ADD COLUMN CustomerID INT NULL');
    } catch(e) { console.log('CustomerID column error:', e.message); }
    
    try {
        await pool.query('ALTER TABLE Orders ADD COLUMN PointsEarned DECIMAL(10,2) DEFAULT 0');
    } catch(e) { console.log('PointsEarned column error:', e.message); }
    
    try {
        await pool.query('ALTER TABLE Orders ADD COLUMN PointsUsed DECIMAL(10,2) DEFAULT 0');
    } catch(e) { console.log('PointsUsed column error:', e.message); }
    
    try {
        await pool.query('ALTER TABLE Orders ADD COLUMN DiscountFromPoints DECIMAL(10,2) DEFAULT 0');
    } catch(e) { console.log('DiscountFromPoints column error:', e.message); }

    console.log('Update complete.');
}

module.exports = updateSchema;
