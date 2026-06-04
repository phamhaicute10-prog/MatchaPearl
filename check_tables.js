const mysql = require('mysql2/promise');

async function check() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'matcha_pearl_db'
        });
        const [rows] = await conn.query('SHOW TABLES;');
        console.log(rows.map(r => Object.values(r)[0]));
        await conn.end();
    } catch (e) {
        console.error(e);
    }
}
check();
