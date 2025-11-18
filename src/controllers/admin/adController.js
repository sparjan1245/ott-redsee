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
    const { type, isActive, startDate, endDate } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.endDate.$lte = new Date(endDate);
    }

    const ads = await Ad.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: ads
    });
  } catch (error) {
    logger.error('Get ads error:', error);
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

module.exports = {
  createAd,
  getAds,
  getAdById,
  updateAd,
  deleteAd
};

