const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create Razorpay order
 */
const createOrder = async (orderData) => {
  try {
    const order = await razorpay.orders.create({
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      payment_capture: 1
    });

    return order;
  } catch (error) {
    logger.error('Razorpay create order error:', error);
    throw error;
  }
};

/**
 * Verify Razorpay signature
 */
const verifySignature = (orderId, paymentId, signature) => {
  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    logger.error('Razorpay signature verification error:', error);
    return false;
  }
};

/**
 * Get payment details
 */
const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    logger.error('Razorpay get payment error:', error);
    throw error;
  }
};

/**
 * Refund payment
 */
const refundPayment = async (paymentId, amount) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100 // Convert to paise
    });
    return refund;
  } catch (error) {
    logger.error('Razorpay refund error:', error);
    throw error;
  }
};

module.exports = {
  createOrder,
  verifySignature,
  getPaymentDetails,
  refundPayment
};

