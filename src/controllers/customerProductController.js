const db = require('../config/db');
const ProductModel = require('../models/productModel');

exports.getPublicCategories = async (req, res) => {
    try {
        const [managers] = await db.query("SELECT UserID FROM Users WHERE Role = 'admin' OR Role = 'manager' LIMIT 1");
        const managerId = managers.length > 0 ? managers[0].UserID : 0;
        const categories = await ProductModel.getAllCategories(managerId);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPublicProducts = async (req, res) => {
    try {
        const [managers] = await db.query("SELECT UserID FROM Users WHERE Role = 'admin' OR Role = 'manager' LIMIT 1");
        const managerId = managers.length > 0 ? managers[0].UserID : 0;
        const products = await ProductModel.getAllProducts(managerId);
        // Lọc các sản phẩm khả dụng (không bị ẩn hoặc hết hàng)
        res.json(products.filter(p => p.Status === 1));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPublicToppings = async (req, res) => {
    try {
        const [managers] = await db.query("SELECT UserID FROM Users WHERE Role = 'admin' OR Role = 'manager' LIMIT 1");
        const managerId = managers.length > 0 ? managers[0].UserID : 0;
        const toppings = await ProductModel.getAllToppings(managerId);
        res.json(toppings.filter(t => t.Status === 1));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
