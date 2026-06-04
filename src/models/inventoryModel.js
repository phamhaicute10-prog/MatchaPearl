const db = require('../config/db');

class InventoryModel {
    static async getAllIngredients(managerId) {
        const [rows] = await db.query('SELECT * FROM Ingredients WHERE ManagerID = ? AND Status = 1', [managerId]);
        return rows;
    }

    static async addIngredient(data, managerId) {
        const { name, unit, minStockLevel, basePrice } = data;
        const [result] = await db.query(
            'INSERT INTO Ingredients (Name, Unit, MinStockLevel, BasePrice, ManagerID) VALUES (?, ?, ?, ?, ?)',
            [name, unit, minStockLevel || 0, basePrice || 0, managerId]
        );
        return result.insertId;
    }

    static async updateIngredient(id, data, managerId) {
        const { name, unit, minStockLevel, basePrice } = data;
        const [result] = await db.query(
            'UPDATE Ingredients SET Name = ?, Unit = ?, MinStockLevel = ?, BasePrice = ? WHERE IngredientID = ? AND ManagerID = ?',
            [name, unit, minStockLevel || 0, basePrice || 0, id, managerId]
        );
        return result.affectedRows;
    }

    static async deleteIngredient(id, managerId) {
        const [result] = await db.query(
            'UPDATE Ingredients SET Status = -1 WHERE IngredientID = ? AND ManagerID = ?',
            [id, managerId]
        );
        return result.affectedRows;
    }

    static async importStock(ingredientId, amount, totalCost, managerId, userId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(
                'UPDATE Ingredients SET CurrentStock = CurrentStock + ? WHERE IngredientID = ? AND ManagerID = ?',
                [amount, ingredientId, managerId]
            );

            await connection.query(
                'INSERT INTO InventoryLogs (IngredientID, ChangeAmount, Type, TotalCost, ManagerID, CreatedBy) VALUES (?, ?, ?, ?, ?, ?)',
                [ingredientId, amount, 'IMPORT', totalCost, managerId, userId]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getRecipesByProduct(productId, managerId) {
        const [rows] = await db.query(
            'SELECT r.*, i.Name as IngredientName, i.Unit FROM Recipes r JOIN Ingredients i ON r.IngredientID = i.IngredientID WHERE r.ProductID = ? AND r.ManagerID = ?',
            [productId, managerId]
        );
        return rows;
    }

    static async addRecipe(productId, ingredientId, amount, managerId) {
        const [result] = await db.query(
            'INSERT INTO Recipes (ProductID, IngredientID, Amount, ManagerID) VALUES (?, ?, ?, ?)',
            [productId, ingredientId, amount, managerId]
        );
        return result.insertId;
    }

    static async deleteRecipe(recipeId, managerId) {
        const [result] = await db.query(
            'DELETE FROM Recipes WHERE RecipeID = ? AND ManagerID = ?',
            [recipeId, managerId]
        );
        return result.affectedRows;
    }
}

module.exports = InventoryModel;
