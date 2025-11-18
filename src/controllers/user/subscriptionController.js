const Subscription = require('../../models/Subscription');
const Plan = require('../../models/Plan');
const Payment = require('../../models/Payment');
const User = require('../../models/User');
const razorpayService = require('../../services/paymentService');
const logger = require('../../utils/logger');

const getSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: { $in: ['active', 'pending'] }
    }).populate('plan');


    res.json({
      success: true,
      data: subscription || null
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    next(error);
  }
};

const subscribe = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const plan = await Plan.findById(planId);
    console.log("plan,", plan);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const existingSubscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active'
    });

    if (existingSubscription && existingSubscription.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription'
      });
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // Create subscription
    const subscription = new Subscription({
      user: req.user.id,
      plan: planId,
      startDate,
      endDate,
      status: 'pending'
    });
    await subscription.save();

    res.status(201).json({
      success: true,
      data: subscription,
      message: 'Subscription created. Please complete payment.'
    });
  } catch (error) {
    logger.error('Subscribe error:', error);
    next(error);
  }
};

const createPaymentOrder = async (req, res, next) => {
  try {
    const { subscriptionId, paymentMethod = 'razorpay' } = req.body;

    const subscription = await Subscription.findById(subscriptionId)
      .populate('plan');
    console.log("subscription,", subscription);

    if (!subscription || subscription.user.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const plan = subscription.plan;
    console.log("plan,", plan);
    if (paymentMethod === 'razorpay') {
      const order = await razorpayService.createOrder({
        amount: plan.price * 100, // Convert to paise
        currency: plan.currency,
        receipt: `sub_${subscription._id}_${Date.now()}`
      });

      // Create payment record
      const payment = new Payment({
        user: req.user.id,
        subscription: subscriptionId,
        plan: plan._id,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod: 'razorpay',
        paymentGateway: {
          razorpayOrderId: order.id
        },
        status: 'pending'
      });
      await payment.save();

      res.json({
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          paymentId: payment._id
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment method not supported'
      });
    }
  } catch (error) {
    logger.error('Create payment order error:', error);
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const payment = await Payment.findById(paymentId)
      .populate('subscription')
      .populate('plan');

    if (!payment || payment.user.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify Razorpay signature
    const isValid = razorpayService.verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      payment.status = 'failed';
      payment.failureReason = 'Invalid signature';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Update payment
    payment.status = 'completed';
    payment.paymentGateway.razorpayPaymentId = razorpayPaymentId;
    payment.paymentGateway.razorpaySignature = razorpaySignature;
    payment.transactionId = razorpayPaymentId;
    await payment.save();

    // Activate subscription
    const subscription = payment.subscription;
    subscription.status = 'active';
    subscription.startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + payment.plan.duration);
    subscription.endDate = endDate;
    await subscription.save();

    // Update user subscription
    const user = await User.findById(req.user.id);
    user.subscription = subscription._id;
    await user.save();

    res.json({
      success: true,
      data: {
        payment,
        subscription
      },
      message: 'Payment verified and subscription activated'
    });
  } catch (error) {
    logger.error('Verify payment error:', error);
    next(error);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    next(error);
  }
};

module.exports = {
  getSubscription,
  subscribe,
  createPaymentOrder,
  verifyPayment,
  cancelSubscription
};

