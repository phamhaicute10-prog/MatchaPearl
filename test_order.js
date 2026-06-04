const db = require('./src/config/db');
const OrderModel = require('./src/models/orderModel');

async function testOrder() {
    try {
        const managerId = 1;
        const staffId = 1;
        const items = [{
            productId: 1, // Assuming 1 is a valid product ID
            quantity: 3,
            sugarLevel: '100%',
            iceLevel: '100%',
            toppings: []
        }];
        const orderId = await OrderModel.createOrder(managerId, staffId, 'CASH', items, null, 'COMPLETED', null, 0, 'Tại chỗ');
        console.log('Order created:', orderId);
    } catch (e) {
        console.error('Error creating order:', e);
    } finally {
        process.exit(0);
    }
}
testOrder();
