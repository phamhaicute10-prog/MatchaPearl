const { PayOS } = require('@payos/node');
const PaymentModel = require('../models/paymentModel');

exports.createPaymentLink = async (req, res) => {
  try {
    const { amount, description, orderId } = req.body;
    
    const userKeys = await PaymentModel.getPayOSKeys(req.userId);
    if (!userKeys) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const { PayosClientId, PayosApiKey, PayosChecksumKey } = userKeys;
    
    if (!PayosClientId || !PayosApiKey || !PayosChecksumKey) {
      return res.status(400).json({ success: false, error: 'Tài khoản chưa cấu hình cổng thanh toán PayOS. Vui lòng vào Cập nhật Hồ sơ để cài đặt.' });
    }
    
    const payos = new PayOS(PayosClientId, PayosApiKey, PayosChecksumKey);

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

    const userKeys = await PaymentModel.getPayOSKeys(req.userId);
    if (!userKeys || !userKeys.PayosClientId) {
      return res.status(400).json({ success: false, error: 'PayOS keys not configured' });
    }
    const payos = new PayOS(userKeys.PayosClientId, userKeys.PayosApiKey, userKeys.PayosChecksumKey);

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
