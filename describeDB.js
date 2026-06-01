const pool = require('./src/config/db');

async function describeDB() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [columns] = await pool.query(`DESCRIBE ${tableName}`);
      console.log(`TABLE ${tableName}:`);
      console.log(columns.map(c => c.Field).join(', '));
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

describeDB();
