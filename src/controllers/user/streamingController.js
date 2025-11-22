const Movie = require('../../models/Movie');
const Episode = require('../../models/Episode');
const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const WatchHistory = require('../../models/WatchHistory');
const { generateStreamingToken, verifyStreamingToken } = require('../../utils/jwt');
const { getSignedDownloadUrl, getVideoPath, getSubtitlePath } = require('../../config/r2');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Quality hierarchy for comparison
const QUALITY_LEVELS = {
  '480p': 1,
  '720p': 2,
  '1080p': 3,
  '4K': 4
};

// Available qualities in order
const AVAILABLE_QUALITIES = ['480p', '720p', '1080p', '4K'];

/**
 * Get max quality allowed by subscription plan
 * @param {Object} plan - Subscription plan object
 * @returns {string} Max quality (480p, 720p, 1080p, 4K)
 */
const getMaxQuality = (plan) => {
  if (!plan || !plan.features || !plan.features.quality) {
    return '480p'; // Default to lowest quality if no plan
  }
  return plan.features.quality;
};

/**
 * Validate and adjust requested quality based on plan
 * @param {string} requestedQuality - User requested quality
 * @param {string} maxQuality - Max quality from plan
 * @returns {string} Valid quality that doesn't exceed plan limit
 */
const validateQuality = (requestedQuality, maxQuality) => {
  if (!requestedQuality) {
    return maxQuality; // Default to max quality from plan
  }

  const requestedLevel = QUALITY_LEVELS[requestedQuality] || 0;
  const maxLevel = QUALITY_LEVELS[maxQuality] || 1;

  // If requested quality exceeds plan, return max from plan
  if (requestedLevel > maxLevel) {
    return maxQuality;
  }

  return requestedQuality;
};

/**
 * Get available qualities based on plan
 * @param {string} maxQuality - Max quality from plan
 * @returns {Array} Array of available quality strings
 */
const getAvailableQualitiesList = (maxQuality) => {
  const maxLevel = QUALITY_LEVELS[maxQuality] || 1;
  return AVAILABLE_QUALITIES.filter(q => QUALITY_LEVELS[q] <= maxLevel);
};

/**
 * Get secure streaming URL for movie
 */
const getMovieStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deviceId, quality } = req.query;
    const userId = req.user.id;

    // Check user subscription
    const user = await User.findById(userId).populate('subscription');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    }).populate('plan');

    if (!subscription || !subscription.isActive()) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required'
      });
    }

    // Get plan max quality
    const plan = subscription.plan;
    const maxQuality = getMaxQuality(plan);
    const validQuality = validateQuality(quality, maxQuality);
    const availableQualities = getAvailableQualitiesList(maxQuality);

    // Check concurrent stream limit
    if (!user.checkStreamLimit()) {
      return res.status(403).json({
        success: false,
        message: 'Maximum concurrent streams reached'
      });
    }

    const movie = await Movie.findById(id);
    if (!movie || !movie.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Determine video path based on quality
    // If movie.video contains a path, use it; otherwise construct from quality
    let videoPath = movie.video;
    
    // If video path doesn't exist or we want HLS quality-specific path
    if (!videoPath || quality) {
      // Try HLS manifest path first (for multi-quality streaming)
      videoPath = getVideoPath('movie', id, validQuality);
    }

    // Generate streaming token
    const streamId = uuidv4();
    const streamingToken = generateStreamingToken({
      userId,
      contentId: id,
      contentType: 'Movie',
      streamId,
      deviceId: deviceId || uuidv4(),
      quality: validQuality
    }, '2h');

    // Track current stream
    user.currentStreams.push({
      contentId: id,
      contentType: 'Movie',
      deviceId: deviceId || uuidv4(),
      startedAt: new Date()
    });
    await user.save();

    // Get playback position from watch history
    const watchHistory = await WatchHistory.findOne({
      user: userId,
      contentId: id,
      contentType: 'Movie'
    });

    // Generate signed URL for video
    const signedUrl = await getSignedDownloadUrl(videoPath, 7200); // 2 hours

    res.json({
      success: true,
      data: {
        streamUrl: signedUrl,
        token: streamingToken,
        quality: validQuality,
        maxQuality: maxQuality,
        availableQualities: availableQualities,
        subtitles: movie.subtitles,
        playbackPosition: watchHistory ? {
          watchedDuration: watchHistory.watchedDuration,
          totalDuration: watchHistory.totalDuration,
          progress: watchHistory.progress,
          resumeAt: watchHistory.watchedDuration
        } : null,
        planFeatures: {
          maxDevices: plan.features?.maxDevices || 5,
          maxStreams: plan.features?.maxStreams || 3,
          adFree: plan.features?.adFree || false,
          download: plan.features?.download || false
        }
      }
    });
  } catch (error) {
    logger.error('Get movie stream error:', error);
    next(error);
  }
};

/**
 * Get secure streaming URL for episode
 */
const getEpisodeStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deviceId, quality } = req.query;
    const userId = req.user.id;

    // Check user subscription
    const user = await User.findById(userId).populate('subscription');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    }).populate('plan');

    if (!subscription || !subscription.isActive()) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required'
      });
    }

    // Get plan max quality
    const plan = subscription.plan;
    const maxQuality = getMaxQuality(plan);
    const validQuality = validateQuality(quality, maxQuality);
    const availableQualities = getAvailableQualitiesList(maxQuality);

    // Check concurrent stream limit
    if (!user.checkStreamLimit()) {
      return res.status(403).json({
        success: false,
        message: 'Maximum concurrent streams reached'
      });
    }

    const episode = await Episode.findById(id).populate('series season');
    if (!episode || !episode.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    // Determine video path based on quality
    let videoPath = episode.video;
    
    // If video path doesn't exist or we want HLS quality-specific path
    if (!videoPath || quality) {
      // Try HLS manifest path (for multi-quality streaming)
      videoPath = getVideoPath('episode', episode.series._id.toString(), validQuality, 
        episode.season._id.toString(), id);
    }

    // Generate streaming token
    const streamId = uuidv4();
    const streamingToken = generateStreamingToken({
      userId,
      contentId: id,
      contentType: 'Episode',
      seriesId: episode.series._id,
      seasonId: episode.season._id,
      streamId,
      deviceId: deviceId || uuidv4(),
      quality: validQuality
    }, '2h');

    // Track current stream
    user.currentStreams.push({
      contentId: id,
      contentType: 'Episode',
      deviceId: deviceId || uuidv4(),
      startedAt: new Date()
    });
    await user.save();

    // Get playback position from watch history
    const watchHistory = await WatchHistory.findOne({
      user: userId,
      contentId: id,
      contentType: 'Episode'
    });

    // Generate signed URL for video
    const signedUrl = await getSignedDownloadUrl(videoPath, 7200); // 2 hours

    res.json({
      success: true,
      data: {
        streamUrl: signedUrl,
        token: streamingToken,
        quality: validQuality,
        maxQuality: maxQuality,
        availableQualities: availableQualities,
        subtitles: episode.subtitles,
        playbackPosition: watchHistory ? {
          watchedDuration: watchHistory.watchedDuration,
          totalDuration: watchHistory.totalDuration,
          progress: watchHistory.progress,
          resumeAt: watchHistory.watchedDuration
        } : null,
        planFeatures: {
          maxDevices: plan.features?.maxDevices || 5,
          maxStreams: plan.features?.maxStreams || 3,
          adFree: plan.features?.adFree || false,
          download: plan.features?.download || false
        }
      }
    });
  } catch (error) {
    logger.error('Get episode stream error:', error);
    next(error);
  }
};

/**
 * Get subtitle URL
 */
const getSubtitle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language } = req.query;

    // Verify user is authenticated (already done by middleware)
    const subtitlePath = getSubtitlePath(id);
    const signedUrl = await getSignedDownloadUrl(subtitlePath, 3600);

    res.json({
      success: true,
      data: {
        subtitleUrl: signedUrl,
        language
      }
    });
  } catch (error) {
    logger.error('Get subtitle error:', error);
    next(error);
  }
};

const getPlaybackPosition = async (req, res, next) => {
  try {
    const { contentId, contentType } = req.query;
    const userId = req.user.id;

    if (!contentId || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content ID and type are required'
      });
    }

    const watchHistory = await WatchHistory.findOne({
      user: userId,
      contentId,
      contentType
    });

    if (!watchHistory) {
      return res.json({
        success: true,
        data: {
          watchedDuration: 0,
          totalDuration: 0,
          progress: 0,
          resumeAt: 0
        }
      });
    }

    res.json({
      success: true,
      data: {
        watchedDuration: watchHistory.watchedDuration,
        totalDuration: watchHistory.totalDuration,
        progress: watchHistory.progress,
        resumeAt: watchHistory.watchedDuration,
        completed: watchHistory.completed,
        lastWatchedAt: watchHistory.lastWatchedAt
      }
    });
  } catch (error) {
    logger.error('Get playback position error:', error);
    next(error);
  }
};

const updatePlaybackPosition = async (req, res, next) => {
  try {
    const { contentId, contentType, watchedDuration, totalDuration, series, season } = req.body;
    const userId = req.user.id;

    if (!contentId || !contentType || watchedDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Content ID, type, and watched duration are required'
      });
    }

    let watchHistory = await WatchHistory.findOne({
      user: userId,
      contentId,
      contentType
    });

    if (watchHistory) {
      watchHistory.watchedDuration = watchedDuration;
      if (totalDuration) watchHistory.totalDuration = totalDuration;
      watchHistory.lastWatchedAt = new Date();
      if (series) watchHistory.series = series;
      if (season) watchHistory.season = season;
      watchHistory.updateProgress();
    } else {
      watchHistory = new WatchHistory({
        user: userId,
        profile: req.user.activeProfile,
        contentId,
        contentType,
        watchedDuration: watchedDuration || 0,
        totalDuration: totalDuration || 0,
        series,
        season
      });
      watchHistory.updateProgress();
    }

    await watchHistory.save();

    res.json({
      success: true,
      data: {
        watchedDuration: watchHistory.watchedDuration,
        totalDuration: watchHistory.totalDuration,
        progress: watchHistory.progress,
        completed: watchHistory.completed
      }
    });
  } catch (error) {
    logger.error('Update playback position error:', error);
    next(error);
  }
};

/**
 * Get available streaming qualities for user's subscription
 */
const getAvailableQualities = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    }).populate('plan');

    if (!subscription || !subscription.isActive()) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required'
      });
    }

    const plan = subscription.plan;
    const maxQuality = getMaxQuality(plan);
    const availableQualities = getAvailableQualitiesList(maxQuality);

    res.json({
      success: true,
      data: {
        maxQuality: maxQuality,
        availableQualities: availableQualities,
        planName: plan.name,
        planFeatures: {
          maxDevices: plan.features?.maxDevices || 5,
          maxStreams: plan.features?.maxStreams || 3,
          adFree: plan.features?.adFree || false,
          download: plan.features?.download || false
        }
      }
    });
  } catch (error) {
    logger.error('Get available qualities error:', error);
    next(error);
  }
};

module.exports = {
  getMovieStream,
  getEpisodeStream,
  getSubtitle,
  getPlaybackPosition,
  updatePlaybackPosition,
  getAvailableQualities
};

