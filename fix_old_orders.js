const db = require('./src/config/db');

async function fixOldOrders() {
    try {
        console.log('Đang sửa lỗi dữ liệu lịch sử cho các đơn hàng cũ...');
        const [result] = await db.query('UPDATE Orders SET FinalAmount = TotalAmount WHERE FinalAmount = 0 AND DiscountAmount = 0 AND TotalAmount > 0');
        console.log(`- Đã sửa thành công ${result.affectedRows} đơn hàng bị lỗi FinalAmount = 0.`);
    } catch (err) {
        console.error('Lỗi khi fix dữ liệu đơn hàng cũ:', err);
    }
}

module.exports = fixOldOrders;
