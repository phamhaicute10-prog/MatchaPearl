const db = require('../config/db');

exports.getPublicCategories = async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM Categories');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPublicProducts = async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM Products WHERE Status = 1');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPublicToppings = async (req, res) => {
    try {
        const [toppings] = await db.query('SELECT * FROM Toppings WHERE Status = 1');
        res.json(toppings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
