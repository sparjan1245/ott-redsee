const Movie = require('../../models/Movie');
const Episode = require('../../models/Episode');
const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const { generateStreamingToken, verifyStreamingToken } = require('../../utils/jwt');
const { getSignedDownloadUrl, getVideoPath, getSubtitlePath } = require('../../config/r2');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Get secure streaming URL for movie
 */
const getMovieStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quality = '1080p', deviceId } = req.query;
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

    // Check quality access based on plan
    const plan = subscription.plan;
    const allowedQualities = ['240p', '360p', '480p'];
    if (plan.features.quality === '720p') allowedQualities.push('720p');
    if (plan.features.quality === '1080p') allowedQualities.push('1080p');
    if (plan.features.quality === '4K') allowedQualities.push('4K');

    if (!allowedQualities.includes(quality)) {
      return res.status(403).json({
        success: false,
        message: `Quality ${quality} not available in your plan`
      });
    }

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

    const videoPath = movie.videoQualities[quality];
    if (!videoPath) {
      return res.status(404).json({
        success: false,
        message: `Quality ${quality} not available for this movie`
      });
    }

    // Generate streaming token
    const streamId = uuidv4();
    const streamingToken = generateStreamingToken({
      userId,
      contentId: id,
      contentType: 'Movie',
      quality,
      streamId,
      deviceId: deviceId || uuidv4()
    }, '2h');

    // Track current stream
    user.currentStreams.push({
      contentId: id,
      contentType: 'Movie',
      deviceId: deviceId || uuidv4(),
      startedAt: new Date()
    });
    await user.save();

    // Generate signed URL for HLS manifest
    const signedUrl = await getSignedDownloadUrl(videoPath, 7200); // 2 hours

    res.json({
      success: true,
      data: {
        streamUrl: signedUrl,
        token: streamingToken,
        quality,
        subtitles: movie.subtitles
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
    const { quality = '1080p', deviceId } = req.query;
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

    // Check quality access
    const plan = subscription.plan;
    const allowedQualities = ['240p', '360p', '480p'];
    if (plan.features.quality === '720p') allowedQualities.push('720p');
    if (plan.features.quality === '1080p') allowedQualities.push('1080p');
    if (plan.features.quality === '4K') allowedQualities.push('4K');

    if (!allowedQualities.includes(quality)) {
      return res.status(403).json({
        success: false,
        message: `Quality ${quality} not available in your plan`
      });
    }

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

    const videoPath = episode.videoQualities[quality];
    if (!videoPath) {
      return res.status(404).json({
        success: false,
        message: `Quality ${quality} not available for this episode`
      });
    }

    // Generate streaming token
    const streamId = uuidv4();
    const streamingToken = generateStreamingToken({
      userId,
      contentId: id,
      contentType: 'Episode',
      seriesId: episode.series._id,
      seasonId: episode.season._id,
      quality,
      streamId,
      deviceId: deviceId || uuidv4()
    }, '2h');

    // Track current stream
    user.currentStreams.push({
      contentId: id,
      contentType: 'Episode',
      deviceId: deviceId || uuidv4(),
      startedAt: new Date()
    });
    await user.save();

    // Generate signed URL for HLS manifest
    const signedUrl = await getSignedDownloadUrl(videoPath, 7200); // 2 hours

    res.json({
      success: true,
      data: {
        streamUrl: signedUrl,
        token: streamingToken,
        quality,
        subtitles: episode.subtitles
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

module.exports = {
  getMovieStream,
  getEpisodeStream,
  getSubtitle
};

