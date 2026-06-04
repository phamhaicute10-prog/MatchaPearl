const pool = require('./src/config/db');

async function testRegister() {
    try {
        const fullName = 'Nguyễn Văn A';
        const phone = '02930830';
        const email = 'phamhaicute10@gmail.com';
        const password = 'Toilahai@2004';
        
        // 1. Kiểm tra Customers
        console.log('Kiểm tra Customers...');
        const [existing] = await pool.query('SELECT CustomerID FROM Customers WHERE Phone = ? OR Email = ?', [phone, email]);
        console.log('Existing in Customers:', existing);
        
        // 2. Kiểm tra Users
        console.log('Kiểm tra Users...');
        const [existingUser] = await pool.query('SELECT UserID FROM Users WHERE Email = ?', [email]);
        console.log('Existing in Users:', existingUser);

        // 3. Lấy Manager
        console.log('Lấy Manager...');
        const [managers] = await pool.query('SELECT UserID FROM Users WHERE Role = "admin" OR Role = "manager" LIMIT 1');
        const managerId = managers.length > 0 ? managers[0].UserID : 0;
        console.log('ManagerID:', managerId);

        // 4. Insert
        console.log('Insert...');
        const [result] = await pool.query(
            'INSERT INTO Customers (ManagerID, FullName, Phone, Email, PasswordHash, TotalPoints, MembershipLevel) VALUES (?, ?, ?, ?, ?, 0, "Đồng")',
            [managerId, fullName, phone, email, password]
        );
        console.log('Result:', result);

    } catch (e) {
        console.error('LỖI:', e);
    } finally {
        process.exit(0);
    }
}
testRegister();
