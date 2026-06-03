const mysql = require('mysql2/promise');

async function test() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'matcha_pearl_db'
    });
    const [rows] = await db.query('SELECT Name, CurrentStock FROM Ingredients');
    console.log("INGREDIENTS:", rows);
    process.exit(0);
}
test();
