const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiRoutes = require('./routes/apiRoutes');
const updateSchema = require('../update_schema');
const updatePointsSchema = require('../update_points_schema');
const updateCustomerSchema = require('../update_customer_schema');
const updateCostSchema = require('../update_cost_schema');
const fixOldOrders = require('../fix_old_orders');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Middleware to parse User-Id and Staff-Id from headers
app.use((req, res, next) => {
    const userId = req.headers['user-id'];
    const staffId = req.headers['staff-id'];
    if (userId) {
        req.userId = parseInt(userId, 10);
    }
    if (staffId) {
        req.staffId = parseInt(staffId, 10);
    }
    next();
});

// Load API Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;

updateSchema().then(() => {
    return updatePointsSchema();
}).then(() => {
    return updateCostSchema();
}).then(() => {
    return fixOldOrders();
}).then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Accessible at: http://0.0.0.0:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to update schema', err);
    process.exit(1);
});
