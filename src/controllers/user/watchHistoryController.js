const WatchHistory = require('../../models/WatchHistory');
const logger = require('../../utils/logger');

const getWatchHistory = async (req, res, next) => {
  try {
    const { profile, limit = 50 } = req.query;
    const query = { user: req.user.id };

    if (profile) {
      query.profile = profile;
    }

    const history = await WatchHistory.find(query)
      .populate('contentId')
      .populate('series')
      .populate('season')
      .sort({ lastWatchedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Get watch history error:', error);
    next(error);
  }
};

const updateWatchHistory = async (req, res, next) => {
  try {
    const { contentId, contentType, watchedDuration, totalDuration, series, season, deviceId } = req.body;

    if (!contentId || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content ID and type are required'
      });
    }

    let history = await WatchHistory.findOne({
      user: req.user.id,
      contentId,
      contentType
    });

    if (history) {
      history.watchedDuration = watchedDuration || history.watchedDuration;
      history.totalDuration = totalDuration || history.totalDuration;
      history.lastWatchedAt = new Date();
      history.deviceId = deviceId || history.deviceId;
      if (series) history.series = series;
      if (season) history.season = season;
      history.updateProgress();
    } else {
      history = new WatchHistory({
        user: req.user.id,
        profile: req.user.activeProfile,
        contentId,
        contentType,
        watchedDuration: watchedDuration || 0,
        totalDuration: totalDuration || 0,
        series,
        season,
        deviceId
      });
      history.updateProgress();
    }

    await history.save();
    await history.populate('contentId');

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Update watch history error:', error);
    next(error);
  }
};

const deleteWatchHistory = async (req, res, next) => {
  try {
    const history = await WatchHistory.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        message: 'Watch history not found'
      });
    }

    res.json({
      success: true,
      message: 'Watch history deleted'
    });
  } catch (error) {
    logger.error('Delete watch history error:', error);
    next(error);
  }
};

const getContinueWatching = async (req, res, next) => {
  try {
    const { profile, limit = 20 } = req.query;
    const query = {
      user: req.user.id,
      completed: false,
      progress: { $gt: 5 } // At least 5% watched
    };

    if (profile) {
      query.profile = profile;
    }

    const history = await WatchHistory.find(query)
      .populate('contentId')
      .populate('series')
      .populate('season')
      .sort({ lastWatchedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Get continue watching error:', error);
    next(error);
  }
};

module.exports = {
  getWatchHistory,
  updateWatchHistory,
  deleteWatchHistory,
  getContinueWatching
};

