const db = require('../config/db');

class ProductModel {
    static async getAllCategories(userId) {
        const [rows] = await db.query('SELECT * FROM Categories WHERE UserID = ?', [userId]);
        return rows;
    }

    static async getAllProducts(userId) {
        const [products] = await db.query('SELECT * FROM Products WHERE UserID = ? AND (Status != -1 OR Status IS NULL)', [userId]);
        const [recipes] = await db.query('SELECT r.ProductID, r.IngredientID, r.Amount, i.Name as IngredientName, i.Unit, i.CurrentStock FROM Recipes r JOIN Ingredients i ON r.IngredientID = i.IngredientID WHERE r.ManagerID = ? AND r.ProductID IS NOT NULL', [userId]);
        
        products.forEach(p => {
            let canMake = true;
            p.recipes = recipes.filter(r => r.ProductID === p.ProductID).map(r => {
                const amt = parseFloat(r.Amount);
                if (parseFloat(r.CurrentStock) < amt) {
                    canMake = false;
                }
                return {
                    ingredientId: r.IngredientID,
                    name: r.IngredientName,
                    unit: r.Unit,
                    amount: amt,
                    currentStock: parseFloat(r.CurrentStock)
                };
            });
            // Tự động kiểm tra Hết hàng
            if (!canMake || p.Status === 0) {
                p.Status = 0; // Báo Hết hàng
            }
        });
        return products;
    }

    static async getAvailableProducts(userId) {
        const [rows] = await db.query('SELECT * FROM Products WHERE UserID = ? AND Status = 1', [userId]);
        return rows;
    }

    static async getAllToppings(userId) {
        const [toppings] = await db.query('SELECT * FROM Toppings WHERE UserID = ? AND (Status != -1 OR Status IS NULL)', [userId]);
        const [recipes] = await db.query('SELECT r.ToppingID, r.IngredientID, r.Amount, i.Name as IngredientName, i.Unit, i.CurrentStock FROM Recipes r JOIN Ingredients i ON r.IngredientID = i.IngredientID WHERE r.ManagerID = ? AND r.ToppingID IS NOT NULL', [userId]);
        
        toppings.forEach(t => {
            let canMake = true;
            t.recipes = recipes.filter(r => r.ToppingID === t.ToppingID).map(r => {
                const amt = parseFloat(r.Amount);
                if (parseFloat(r.CurrentStock) < amt) {
                    canMake = false;
                }
                return {
                    ingredientId: r.IngredientID,
                    name: r.IngredientName,
                    unit: r.Unit,
                    amount: amt,
                    currentStock: parseFloat(r.CurrentStock)
                };
            });
            if (!canMake || t.Status === 0) {
                t.Status = 0;
            }
        });
        return toppings;
    }

    static async createProduct(productData, userId) {
        const { CategoryID, ProductName, Price, Description, ImageURL, Status } = productData;
        const [result] = await db.query(
            'INSERT INTO Products (CategoryID, ProductName, BasePrice, Description, Image, Status, UserID) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                CategoryID, 
                ProductName, 
                Price, 
                Description || null, 
                ImageURL || null,
                (Status !== undefined && Status !== null) ? Status : 1,
                userId
            ]
        );
        
        const productId = result.insertId;
        if (productData.recipes && Array.isArray(productData.recipes)) {
            for (const r of productData.recipes) {
                await db.query('INSERT INTO Recipes (ProductID, IngredientID, Amount, ManagerID) VALUES (?, ?, ?, ?)', [productId, r.ingredientId, r.amount, userId]);
            }
        }
        return productId;
    }

    static async updateProduct(id, productData, userId) {
        const { CategoryID, ProductName, Price, Description, ImageURL, Status } = productData;
        let query = 'UPDATE Products SET CategoryID = ?, ProductName = ?, BasePrice = ?, Description = ?, Status = ?';
        let params = [CategoryID, ProductName, Price, Description, Status];

        if (ImageURL) {
            query += ', Image = ?';
            params.push(ImageURL);
        }

        query += ' WHERE ProductID = ? AND UserID = ?';
        params.push(id, userId);

        console.log('--- DATABASE UPDATE DEBUG ---');
        console.log('Query:', query);
        console.log('Parameters:', params);
        console.log('-----------------------------');

        const [result] = await db.query(query, params);
        
        if (productData.recipes && Array.isArray(productData.recipes)) {
            await db.query('DELETE FROM Recipes WHERE ProductID = ? AND ManagerID = ?', [id, userId]);
            for (const r of productData.recipes) {
                await db.query('INSERT INTO Recipes (ProductID, IngredientID, Amount, ManagerID) VALUES (?, ?, ?, ?)', [id, r.ingredientId, r.amount, userId]);
            }
        }

        return result.affectedRows;
    }

    static async deleteProduct(id, userId) {
        // Use soft delete to prevent foreign key constraint errors with historical orders
        const [result] = await db.query('UPDATE Products SET Status = -1 WHERE ProductID = ? AND UserID = ?', [id, userId]);
        return result.affectedRows;
    }

    static async createTopping(toppingData, userId) {
        const { ToppingName, Price, Description, ImageURL, Status } = toppingData;
        const [result] = await db.query(
            'INSERT INTO Toppings (ToppingName, Price, Description, Image, UserID, Status) VALUES (?, ?, ?, ?, ?, ?)',
            [ToppingName, Price, Description || null, ImageURL || null, userId, (Status !== undefined && Status !== null) ? Status : 1]
        );
        
        const toppingId = result.insertId;
        if (toppingData.recipes && Array.isArray(toppingData.recipes)) {
            for (const r of toppingData.recipes) {
                await db.query('INSERT INTO Recipes (ToppingID, IngredientID, Amount, ManagerID) VALUES (?, ?, ?, ?)', [toppingId, r.ingredientId, r.amount, userId]);
            }
        }
        return toppingId;
    }

    static async updateTopping(id, toppingData, userId) {
        const { ToppingName, Price, Description, ImageURL, Status } = toppingData;
        let query = 'UPDATE Toppings SET ToppingName = ?, Price = ?, Description = ?, Status = ?';
        let params = [ToppingName, Price, Description || null, Status !== undefined ? Status : 1];

        if (ImageURL) {
            query += ', Image = ?';
            params.push(ImageURL);
        }

        query += ' WHERE ToppingID = ? AND UserID = ?';
        params.push(id, userId);

        const [result] = await db.query(query, params);
        
        if (toppingData.recipes && Array.isArray(toppingData.recipes)) {
            await db.query('DELETE FROM Recipes WHERE ToppingID = ? AND ManagerID = ?', [id, userId]);
            for (const r of toppingData.recipes) {
                await db.query('INSERT INTO Recipes (ToppingID, IngredientID, Amount, ManagerID) VALUES (?, ?, ?, ?)', [id, r.ingredientId, r.amount, userId]);
            }
        }

        return result.affectedRows;
    }

    static async deleteTopping(id, userId) {
        // Use soft delete to prevent foreign key constraint errors with historical orders
        const [result] = await db.query('UPDATE Toppings SET Status = -1 WHERE ToppingID = ? AND UserID = ?', [id, userId]);
        return result.affectedRows;
    }
}

module.exports = ProductModel;
