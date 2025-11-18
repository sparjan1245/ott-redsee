const User = require('../../models/User');
const logger = require('../../utils/logger');

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive, isBanned } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isBanned !== undefined) {
      query.isBanned = isBanned === 'true';
    }

    const users = await User.find(query)
      .select('-password -refreshTokens')
      .populate('subscription')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens')
      .populate('subscription')
      .populate('devices');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    next(error);
  }
};

const banUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isBanned: true,
        banReason: reason || 'Violation of terms of service'
      },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User banned successfully'
    });
  } catch (error) {
    logger.error('Ban user error:', error);
    next(error);
  }
};

const unbanUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isBanned: false,
        banReason: null
      },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User unbanned successfully'
    });
  } catch (error) {
    logger.error('Unban user error:', error);
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  banUser,
  unbanUser
};

