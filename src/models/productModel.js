const db = require('../config/db');

class ProductModel {
    static async getAllCategories() {
        const [rows] = await db.query('SELECT * FROM Categories');
        return rows;
    }

    static async getAllProducts() {
        const [rows] = await db.query('SELECT * FROM Products WHERE Status != -1 OR Status IS NULL');
        return rows;
    }

    static async getAvailableProducts() {
        const [rows] = await db.query('SELECT * FROM Products WHERE Status = 1');
        return rows;
    }

    static async getAllToppings() {
        const [rows] = await db.query('SELECT * FROM Toppings');
        return rows;
    }

    static async createProduct(productData) {
        const { CategoryID, ProductName, Price, Description, ImageURL, Status } = productData;
        const [result] = await db.query(
            'INSERT INTO Products (CategoryID, ProductName, BasePrice, Description, Image, Status) VALUES (?, ?, ?, ?, ?, ?)',
            [
                CategoryID, 
                ProductName, 
                Price, 
                Description || null, 
                ImageURL || null,
                (Status !== undefined && Status !== null) ? Status : 1
            ]
        );
        return result.insertId;
    }

    static async updateProduct(id, productData) {
        const { CategoryID, ProductName, Price, Description, ImageURL, Status } = productData;
        let query = 'UPDATE Products SET CategoryID = ?, ProductName = ?, BasePrice = ?, Description = ?, Status = ?';
        let params = [CategoryID, ProductName, Price, Description, Status];

        if (ImageURL) {
            query += ', Image = ?';
            params.push(ImageURL);
        }

        query += ' WHERE ProductID = ?';
        params.push(id);

        console.log('--- DATABASE UPDATE DEBUG ---');
        console.log('Query:', query);
        console.log('Parameters:', params);
        console.log('-----------------------------');

        const [result] = await db.query(query, params);
        return result.affectedRows;
    }

    static async deleteProduct(id) {
        try {
            const [result] = await db.query('DELETE FROM Products WHERE ProductID = ?', [id]);
            return result.affectedRows;
        } catch (error) {
            // ER_ROW_IS_REFERENCED_2 means it is used in another table (e.g. OrderItems)
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                console.log(`Product ${id} is referenced in an order. Soft deleting...`);
                const [result] = await db.query('UPDATE Products SET Status = -1 WHERE ProductID = ?', [id]);
                return result.affectedRows;
            }
            throw error;
        }
    }

    static async createTopping(toppingData) {
        const { ToppingName, Price, Description, ImageURL, UserID, Status } = toppingData;
        const [result] = await db.query(
            'INSERT INTO Toppings (ToppingName, Price, Description, Image, UserID, Status) VALUES (?, ?, ?, ?, ?, ?)',
            [ToppingName, Price, Description || null, ImageURL || null, UserID || 2, (Status !== undefined && Status !== null) ? Status : 1]
        );
        return result.insertId;
    }

    static async updateTopping(id, toppingData) {
        const { ToppingName, Price, Description, ImageURL, Status } = toppingData;
        let query = 'UPDATE Toppings SET ToppingName = ?, Price = ?, Description = ?, Status = ?';
        let params = [ToppingName, Price, Description || null, Status !== undefined ? Status : 1];

        if (ImageURL) {
            query += ', Image = ?';
            params.push(ImageURL);
        }

        query += ' WHERE ToppingID = ?';
        params.push(id);

        const [result] = await db.query(query, params);
        return result.affectedRows;
    }

    static async deleteTopping(id) {
        const [result] = await db.query('DELETE FROM Toppings WHERE ToppingID = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = ProductModel;
