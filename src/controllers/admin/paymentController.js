const Payment = require('../../models/Payment');
const Subscription = require('../../models/Subscription');
const logger = require('../../utils/logger');

const getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, paymentMethod, startDate, endDate } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Payment.find(query)
      .populate('user', 'email phone')
      .populate('plan')
      .populate('subscription')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Payment.findById(req.params.id)
      .populate('user', 'email phone')
      .populate('plan')
      .populate('subscription');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Get order by ID error:', error);
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('user', 'email phone')
      .populate('plan')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    // Calculate summary
    const summary = await Payment.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          completedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: payments,
      summary: summary[0] || {},
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get payments error:', error);
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  getPayments
};

