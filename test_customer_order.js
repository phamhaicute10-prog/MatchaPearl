const db = require('./src/config/db');
const customerOrderController = require('./src/controllers/customerOrderController');

async function testCustomerOrder() {
    try {
        const req = {
            headers: { 'customer-id': '1' }, // Assuming customer 1 exists
            body: {
                paymentMethod: 'COD',
                orderType: 'Giao hàng',
                shippingAddress: '123 Test St',
                items: [{
                    productId: 1, // Cà phê đen?
                    quantity: 1,
                    sugarLevel: '100%',
                    iceLevel: '100%',
                    toppings: []
                }]
            }
        };
        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log('Response:', this.statusCode, data);
            }
        };
        
        await customerOrderController.createOnlineOrder(req, res);
    } catch (e) {
        console.error('Fatal error:', e);
    } finally {
        process.exit(0);
    }
}
testCustomerOrder();
