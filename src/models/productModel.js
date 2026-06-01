const db = require('../config/db');

class ProductModel {
    static async getAllCategories(userId) {
        const [rows] = await db.query('SELECT * FROM Categories WHERE UserID = ?', [userId]);
        return rows;
    }

    static async getAllProducts(userId) {
        const [rows] = await db.query('SELECT * FROM Products WHERE UserID = ? AND (Status != -1 OR Status IS NULL)', [userId]);
        return rows;
    }

    static async getAvailableProducts(userId) {
        const [rows] = await db.query('SELECT * FROM Products WHERE UserID = ? AND Status = 1', [userId]);
        return rows;
    }

    static async getAllToppings(userId) {
        const [rows] = await db.query('SELECT * FROM Toppings WHERE UserID = ?', [userId]);
        return rows;
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
        return result.insertId;
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
        return result.affectedRows;
    }

    static async deleteProduct(id, userId) {
        try {
            const [result] = await db.query('DELETE FROM Products WHERE ProductID = ? AND UserID = ?', [id, userId]);
            return result.affectedRows;
        } catch (error) {
            // ER_ROW_IS_REFERENCED_2 means it is used in another table (e.g. OrderItems)
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                console.log(`Product ${id} is referenced in an order. Soft deleting...`);
                const [result] = await db.query('UPDATE Products SET Status = -1 WHERE ProductID = ? AND UserID = ?', [id, userId]);
                return result.affectedRows;
            }
            throw error;
        }
    }

    static async createTopping(toppingData, userId) {
        const { ToppingName, Price, Description, ImageURL, Status } = toppingData;
        const [result] = await db.query(
            'INSERT INTO Toppings (ToppingName, Price, Description, Image, UserID, Status) VALUES (?, ?, ?, ?, ?, ?)',
            [ToppingName, Price, Description || null, ImageURL || null, userId, (Status !== undefined && Status !== null) ? Status : 1]
        );
        return result.insertId;
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
        return result.affectedRows;
    }

    static async deleteTopping(id, userId) {
        const [result] = await db.query('DELETE FROM Toppings WHERE ToppingID = ? AND UserID = ?', [id, userId]);
        return result.affectedRows;
    }
}

module.exports = ProductModel;
