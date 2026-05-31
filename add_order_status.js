const pool = require('./src/config/db');

async function run() {
    try {
        console.log('Adding Status column to Orders...');
        await pool.query("ALTER TABLE Orders ADD COLUMN Status VARCHAR(20) DEFAULT 'COMPLETED'");
        console.log('Successfully added Status column.');
        process.exit(0);
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Status column already exists.');
            process.exit(0);
        } else {
            console.error('Error adding Status column:', e);
            process.exit(1);
        }
    }
}

run();
