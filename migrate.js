const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Running migration...');
        
        // 1. Ensure user 'abc' exists
        await pool.query("INSERT IGNORE INTO Users (Username, Password, FullName) VALUES ('abc', '123', 'Cửa hàng mặc định')");
        
        const [rows] = await pool.query("SELECT UserID FROM Users WHERE Username = 'abc' LIMIT 1");
        const userId = rows[0].UserID;
        console.log('User abc ID:', userId);

        // 2. Add columns if not exist
        const tables = ['Categories', 'Products', 'Toppings'];
        for (const table of tables) {
            try {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN UserID INT`);
                console.log(`Added UserID to ${table}`);
            } catch (e) {
                if (e.code !== 'ER_DUP_FIELDNAME') {
                    console.error(`Error adding column to ${table}:`, e.message);
                }
            }
        }

        // 3. Update existing records
        for (const table of tables) {
            await pool.query(`UPDATE ${table} SET UserID = ? WHERE UserID IS NULL`, [userId]);
            console.log(`Updated ${table} with UserID = ${userId}`);
        }
        await pool.query(`UPDATE Orders SET UserID = ? WHERE UserID IS NULL`, [userId]);

        // 4. Add foreign keys safely
        for (const table of tables) {
            try {
                // Determine foreign key name
                let fkName = '';
                if (table === 'Categories') fkName = 'fk_cat_user';
                if (table === 'Products') fkName = 'fk_prod_user';
                if (table === 'Toppings') fkName = 'fk_top_user';

                await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT ${fkName} FOREIGN KEY (UserID) REFERENCES Users(UserID)`);
                console.log(`Added FK to ${table}`);
            } catch (e) {
                 // Ignore if FK already exists (Error code varies)
                 console.log(`FK might already exist for ${table}:`, e.message);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
