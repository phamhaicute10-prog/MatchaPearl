const db = require('../config/db');

class RecipeModel {
    static async getRecipesByProductId(productId, managerId) {
        const [recipes] = await db.query(
            'SELECT r.Amount, r.IngredientID FROM Recipes r WHERE r.ProductID = ? AND r.ManagerID = ?', 
            [productId, managerId]
        );
        return recipes;
    }

    static async getRecipesByToppingId(toppingId, managerId) {
        const [recipes] = await db.query(
            'SELECT r.Amount, r.IngredientID FROM Recipes r WHERE r.ToppingID = ? AND r.ManagerID = ?', 
            [toppingId, managerId]
        );
        return recipes;
    }

    static async checkIngredientStock(ingredientId, amountNeeded, managerId) {
        const [ing] = await db.query(
            'SELECT CurrentStock, Name FROM Ingredients WHERE IngredientID = ? AND ManagerID = ?', 
            [ingredientId, managerId]
        );
        
        if (ing.length > 0 && ing[0].CurrentStock < amountNeeded) {
            return {
                sufficient: false,
                name: ing[0].Name,
                stock: ing[0].CurrentStock
            };
        }
        return { sufficient: true };
    }
}

module.exports = RecipeModel;
