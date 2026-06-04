const db = require('./src/config/db');

async function updateCostSchema() {
    try {
        console.log('1. Bổ sung cột TotalCost vào bảng InventoryLogs...');
        try {
            await db.query('ALTER TABLE InventoryLogs ADD COLUMN TotalCost DECIMAL(12,2) DEFAULT 0');
            console.log(' - Đã thêm cột TotalCost.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log(' - Cột TotalCost đã tồn tại.');
            } else {
                throw e;
            }
        }

        console.log('2. Lấy thông tin tồn kho hiện tại để tạo phiếu INITIAL_STOCK duy nhất...');
        // Kiểm tra xem đã có INITIAL_STOCK chưa, nếu có thì không làm nữa để tránh nhân đôi
        const [existing] = await db.query("SELECT LogID FROM InventoryLogs WHERE Type = 'INITIAL_STOCK' LIMIT 1");
        if (existing.length > 0) {
            console.log(' - Dữ liệu INITIAL_STOCK đã tồn tại, bỏ qua bước khởi tạo.');
            return;
        }

        const [ingredients] = await db.query('SELECT IngredientID, CurrentStock, BasePrice, ManagerID FROM Ingredients WHERE Status = 1 AND CurrentStock > 0');
        
        if (ingredients.length > 0) {
            console.log(` - Tìm thấy ${ingredients.length} nguyên liệu đang có tồn kho. Đang tạo phiếu...`);
            for (let ing of ingredients) {
                const stock = parseFloat(ing.CurrentStock);
                const price = parseFloat(ing.BasePrice || 0);
                const totalCost = stock * price;

                await db.query(
                    'INSERT INTO InventoryLogs (IngredientID, ChangeAmount, Type, TotalCost, ManagerID, CreatedBy) VALUES (?, ?, ?, ?, ?, ?)',
                    [ing.IngredientID, stock, 'INITIAL_STOCK', totalCost, ing.ManagerID, 1]
                );
            }
            console.log(' - Đã tạo xong phiếu chi phí tồn kho ban đầu!');
        } else {
            console.log(' - Không có nguyên liệu nào đang tồn kho.');
        }
        
    } catch (err) {
        console.error('Lỗi khi cập nhật schema chi phí:', err);
    } finally {
        process.exit(0);
    }
}

updateCostSchema();
