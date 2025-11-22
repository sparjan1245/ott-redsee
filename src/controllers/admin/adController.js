const Ad = require('../../models/Ad');
const logger = require('../../utils/logger');

const createAd = async (req, res, next) => {
  try {
    const ad = new Ad(req.body);
    await ad.save();

    res.status(201).json({
      success: true,
      data: ad
    });
  } catch (error) {
    logger.error('Create ad error:', error);
    next(error);
  }
};

const getAds = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, type, isActive, startDate, endDate } = req.query;
    const query = {};

    // Search by title
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Active filter
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Date range filter
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.endDate.$lte = new Date(endDate);
    }

    // Fetch paginated ads
    const ads = await Ad.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Total count
    const total = await Ad.countDocuments(query);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get ads error:", error);
    next(error);
  }
};

const getAdById = async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    res.json({
      success: true,
      data: ad
    });
  } catch (error) {
    logger.error('Get ad by ID error:', error);
    next(error);
  }
};

const updateAd = async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    res.json({
      success: true,
      data: ad
    });
  } catch (error) {
    logger.error('Update ad error:', error);
    next(error);
  }
};

const deleteAd = async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    res.json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    logger.error('Delete ad error:', error);
    next(error);
  }
};

const toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value (true or false)'
      });
    }

    const ad = await Ad.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    res.json({
      success: true,
      message: `Ad ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: ad
    });
  } catch (error) {
    logger.error('Toggle ad active status error:', error);
    next(error);
  }
};

module.exports = {
  createAd,
  getAds,
  getAdById,
  updateAd,
  deleteAd,
  toggleActive
};

