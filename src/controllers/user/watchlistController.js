const Watchlist = require('../../models/Watchlist');
const logger = require('../../utils/logger');

const getWatchlist = async (req, res, next) => {
  try {
    const { profile } = req.query;
    const query = { user: req.user.id };

    if (profile) {
      query.profile = profile;
    }

    const watchlist = await Watchlist.find(query)
      .populate('contentId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: watchlist
    });
  } catch (error) {
    logger.error('Get watchlist error:', error);
    next(error);
  }
};

const addToWatchlist = async (req, res, next) => {
  try {
    const { contentId, contentType, profile } = req.body;

    if (!contentId || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content ID and type are required'
      });
    }

    const watchlistItem = new Watchlist({
      user: req.user.id,
      profile: profile || req.user.activeProfile,
      contentId,
      contentType
    });

    await watchlistItem.save();
    await watchlistItem.populate('contentId');

    res.status(201).json({
      success: true,
      data: watchlistItem
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Already in watchlist'
      });
    }
    logger.error('Add to watchlist error:', error);
    next(error);
  }
};

const removeFromWatchlist = async (req, res, next) => {
  try {
    const watchlistItem = await Watchlist.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!watchlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Watchlist item not found'
      });
    }

    res.json({
      success: true,
      message: 'Removed from watchlist'
    });
  } catch (error) {
    logger.error('Remove from watchlist error:', error);
    next(error);
  }
};

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
};

