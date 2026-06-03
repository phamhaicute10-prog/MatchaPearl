const InventoryModel = require('../models/inventoryModel');

exports.getIngredients = async (req, res) => {
    try {
        const managerId = req.userId;
        const rows = await InventoryModel.getAllIngredients(managerId);
        res.json({ success: true, ingredients: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addIngredient = async (req, res) => {
    try {
        const managerId = req.userId;
        const id = await InventoryModel.addIngredient(req.body, managerId);
        res.json({ success: true, ingredientId: id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateIngredient = async (req, res) => {
    try {
        const managerId = req.userId;
        const affected = await InventoryModel.updateIngredient(req.params.id, req.body, managerId);
        if (affected === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteIngredient = async (req, res) => {
    try {
        const managerId = req.userId;
        const affected = await InventoryModel.deleteIngredient(req.params.id, managerId);
        if (affected === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.importStock = async (req, res) => {
    try {
        const managerId = req.userId;
        const userId = req.staffId || req.userId;
        const { amount } = req.body;
        await InventoryModel.importStock(req.params.id, amount, managerId, userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getRecipes = async (req, res) => {
    try {
        const managerId = req.userId;
        const rows = await InventoryModel.getRecipesByProduct(req.params.productId, managerId);
        res.json({ success: true, recipes: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addRecipe = async (req, res) => {
    try {
        const managerId = req.userId;
        const { ingredientId, amount } = req.body;
        const id = await InventoryModel.addRecipe(req.params.productId, ingredientId, amount, managerId);
        res.json({ success: true, recipeId: id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteRecipe = async (req, res) => {
    try {
        const managerId = req.userId;
        const affected = await InventoryModel.deleteRecipe(req.params.recipeId, managerId);
        if (affected === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
