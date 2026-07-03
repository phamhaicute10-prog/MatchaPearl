const CustomerProductModel = require('../models/customerProductModel');

exports.getPublicCategories = async (req, res) => {
    try {
        const categories = await CustomerProductModel.getPublicCategories();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPublicProducts = async (req, res) => {
    try {
        const products = await CustomerProductModel.getPublicProducts();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPublicToppings = async (req, res) => {
    try {
        const toppings = await CustomerProductModel.getPublicToppings();
        res.json(toppings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
