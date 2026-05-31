const { PayOS } = require('@payos/node');

// Initializing PayOS with user's credentials loaded from environment
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

exports.createPaymentLink = async (req, res) => {
  try {
    const { amount, description, orderId } = req.body;

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
    
    // Query PayOS directly for real-time payment link status
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
