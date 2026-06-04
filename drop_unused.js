const db = require('./src/config/db');

async function dropUnused() {
    try {
        console.log('Dropping unused tables...');
        await db.query('DROP TABLE IF EXISTS Reviews');
        await db.query('DROP TABLE IF EXISTS Shifts');
        console.log('Successfully dropped Reviews and Shifts tables.');
    } catch (e) {
        console.error('Error dropping tables:', e);
    } finally {
        process.exit(0);
    }
}
dropUnused();
