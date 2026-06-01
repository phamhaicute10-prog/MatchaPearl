const pool = require('./src/config/db');

async function migrateDB() {
  try {
    // 1. Delete user1
    await pool.query("DELETE FROM Users WHERE Username = 'user1'");
    console.log("Deleted user1");

    // 2. Make Email UNIQUE
    // Wait, let's check if there are duplicate emails first or nulls.
    // Since Email was added recently, it's mostly NULL.
    // UNIQUE allows multiple NULLs in MySQL/MariaDB.
    try {
      await pool.query("ALTER TABLE Users ADD UNIQUE (Email)");
      console.log("Added UNIQUE constraint to Email");
    } catch (e) {
      console.log("Email might already be unique or has duplicate issue:", e.message);
    }

    // 3. Get ID of abc
    const [rows] = await pool.query("SELECT UserID FROM Users WHERE Username = 'abc'");
    if (rows.length > 0) {
      const abcId = rows[0].UserID;
      console.log("Found abc UserID:", abcId);

      // Update tables
      await pool.query("UPDATE Products SET UserID = ? WHERE UserID IS NULL OR UserID != ?", [abcId, abcId]);
      await pool.query("UPDATE Categories SET UserID = ? WHERE UserID IS NULL OR UserID != ?", [abcId, abcId]);
      await pool.query("UPDATE Toppings SET UserID = ? WHERE UserID IS NULL OR UserID != ?", [abcId, abcId]);
      await pool.query("UPDATE Orders SET UserID = ? WHERE UserID IS NULL OR UserID != ?", [abcId, abcId]);
      console.log("Re-assigned all data to abc");
    } else {
      console.log("User abc not found");
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

migrateDB();
