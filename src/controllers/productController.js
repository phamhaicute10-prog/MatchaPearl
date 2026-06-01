const ProductModel = require('../models/productModel');

exports.getCategories = async (req, res) => {
    try {
        const rows = await ProductModel.getAllCategories(req.userId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const rows = await ProductModel.getAllProducts(req.userId);
        if (rows.length > 0) {
            console.log('--- DATABASE ROW STRUCTURE ---');
            console.log('Available columns:', Object.keys(rows[0]));
            console.log('First row data:', rows[0]);
            console.log('------------------------------');
        }
        res.json(rows);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getToppings = async (req, res) => {
    try {
        const rows = await ProductModel.getAllToppings(req.userId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addProduct = async (req, res) => {
    try {
        const { CategoryID, ProductName, Price, Description, Status } = req.body;
        const ImageURL = req.file ? `/uploads/${req.file.filename}` : '';
        
        if (!CategoryID || !ProductName || !Price) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log(`Adding product. Received Status: ${Status} (Type: ${typeof Status})`);
        const statusValue = (Status !== undefined && Status !== null && Status !== '') ? parseInt(Status) : 1;
        
        const newProductId = await ProductModel.createProduct({
            CategoryID, ProductName, Price, Description, ImageURL, Status: statusValue
        }, req.userId);
        
        res.status(201).json({ message: "Product created successfully", productId: newProductId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { CategoryID, ProductName, Price, Description, Status } = req.body;
        const ImageURL = req.file ? `/uploads/${req.file.filename}` : null;

        const affectedRows = await ProductModel.updateProduct(id, {
            CategoryID, 
            ProductName, 
            Price, 
            Description, 
            ImageURL, 
            Status: (Status !== undefined && Status !== null && Status !== '') ? parseInt(Status) : 1
        }, req.userId);

        if (affectedRows === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json({ message: "Product updated successfully" });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const affectedRows = await ProductModel.deleteProduct(id, req.userId);

        if (affectedRows === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addTopping = async (req, res) => {
    try {
        const { ToppingName, Price, Description, UserID, Status } = req.body;
        const ImageURL = req.file ? `/uploads/${req.file.filename}` : null;
        
        if (!ToppingName || !Price) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const insertId = await ProductModel.createTopping({ ToppingName, Price, Description, ImageURL, Status }, req.userId);
        res.status(201).json({ message: "Topping added successfully", toppingId: insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTopping = async (req, res) => {
    try {
        const { id } = req.params;
        const { ToppingName, Price, Description, Status } = req.body;
        const ImageURL = req.file ? `/uploads/${req.file.filename}` : null;
        
        if (!ToppingName || !Price) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const affectedRows = await ProductModel.updateTopping(id, { ToppingName, Price, Description, ImageURL, Status }, req.userId);
        if (affectedRows === 0) return res.status(404).json({ error: "Topping not found" });
        res.json({ message: "Topping updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteTopping = async (req, res) => {
    try {
        const { id } = req.params;
        const affectedRows = await ProductModel.deleteTopping(id, req.userId);
        if (affectedRows === 0) return res.status(404).json({ error: "Topping not found" });
        res.json({ message: "Topping deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
