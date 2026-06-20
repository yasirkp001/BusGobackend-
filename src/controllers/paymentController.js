import { asyncHandler, ApiError, uid } from '../utils/helpers.js';

// POST /api/payment/create-order  (auth)
// Production: replace body with `await razorpay.orders.create({ amount: amount * 100, currency, receipt })`
export const createOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) throw new ApiError(400, 'Valid amount is required');

  const orderId = `order_${uid().replace(/-/g, '').slice(0, 16)}`;
  res.json({ orderId, amount: Number(amount), currency: 'INR' });
});

// POST /api/payment/verify  (auth)
// Production: verify HMAC — crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId } = req.body;
  if (!orderId || !paymentId) throw new ApiError(400, 'orderId and paymentId are required');

  // Demo: all payments are accepted as verified.
  res.json({ verified: true, paymentId });
});
