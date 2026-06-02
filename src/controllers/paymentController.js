const { PayOS } = require('@payos/node');
const pool = require('../config/db');

exports.createPaymentLink = async (req, res) => {
  try {
    const { amount, description, orderId } = req.body;
    
    // Fetch PayOS keys for the current user
    const [userRows] = await pool.query('SELECT PayosClientId, PayosApiKey, PayosChecksumKey FROM Users WHERE UserID = ?', [req.userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const { PayosClientId, PayosApiKey, PayosChecksumKey } = userRows[0];
    
    if (!PayosClientId || !PayosApiKey || !PayosChecksumKey) {
      return res.status(400).json({ success: false, error: 'Tài khoản chưa cấu hình cổng thanh toán PayOS. Vui lòng vào Cập nhật Hồ sơ để cài đặt.' });
    }
    
    const payos = new PayOS(PayosClientId, PayosApiKey, PayosChecksumKey);

    // orderCode must be an integer and unique. Let's use timestamp-based unique integer
    const orderCode = orderId ? parseInt(orderId) : Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

    const paymentData = {
      orderCode: orderCode,
      amount: parseInt(amount),
      description: description ? description.substring(0, 25) : `Don hang ${orderCode}`,
      cancelUrl: 'http://localhost:3000/cancel',
      returnUrl: 'http://localhost:3000/success',
    };

    console.log('Creating PayOS payment request with payload:', paymentData);
    const response = await payos.paymentRequests.create(paymentData);

    res.status(200).json({
      success: true,
      checkoutUrl: response.checkoutUrl,
      qrCode: response.qrCode,
      orderCode: orderCode
    });
  } catch (error) {
    console.error("PayOS Payment Link Creation Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;

    // Fetch PayOS keys for the current user
    const [userRows] = await pool.query('SELECT PayosClientId, PayosApiKey, PayosChecksumKey FROM Users WHERE UserID = ?', [req.userId]);
    if (userRows.length === 0 || !userRows[0].PayosClientId) {
      return res.status(400).json({ success: false, error: 'PayOS keys not configured' });
    }
    const payos = new PayOS(userRows[0].PayosClientId, userRows[0].PayosApiKey, userRows[0].PayosChecksumKey);

    // Query PayOS directly for real-time payment status
    const paymentInfo = await payos.paymentRequests.get(parseInt(orderCode));
    
    res.status(200).json({
      success: true,
      status: paymentInfo.status,
      paid: paymentInfo.status === 'PAID'
    });
  } catch (error) {
    console.error("PayOS Status Check Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
