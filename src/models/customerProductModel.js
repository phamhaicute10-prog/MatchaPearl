const db = require('../config/db');

class CustomerProductModel {
    static async getPublicCategories() {
        const [categories] = await db.query('SELECT * FROM Categories');
        return categories;
    }

    static async getPublicProducts() {
        const [products] = await db.query(`
            SELECT p.*, c.CategoryName 
            FROM Products p
            LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
            WHERE p.Status = 1
        `);
        return products;
    }

    static async getPublicToppings() {
        const [toppings] = await db.query('SELECT * FROM Toppings WHERE Status = 1');
        return toppings;
    }
}

module.exports = CustomerProductModel;
