const { getSignedUploadUrl, getThumbnailPath, getSubtitlePath, getVideoPath, PUBLIC_URL } = require('../../config/r2');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

/**
 * Get signed URL for uploading thumbnail
 */
const getThumbnailUploadUrl = async (req, res, next) => {
  try {
    const { contentType } = req.body; // 'movie' or 'series' or 'episode'
    const thumbnailId = uuidv4();
    const key = getThumbnailPath(thumbnailId);
    const url = await getSignedUploadUrl(key, 'image/jpeg', 3600);

    res.json({
      success: true,
      data: {
        uploadUrl: url,
        thumbnailId,
        key,
        publicUrl: `${PUBLIC_URL}/${key}`
      }
    });
  } catch (error) {
    logger.error('Get thumbnail upload URL error:', error);
    next(error);
  }
};

/**
 * Get signed URL for uploading poster
 */
const getPosterUploadUrl = async (req, res, next) => {
  try {
    const posterId = uuidv4();
    const key = `posters/${posterId}.jpg`;
    const url = await getSignedUploadUrl(key, 'image/jpeg', 3600);

    res.json({
      success: true,
      data: {
        uploadUrl: url,
        posterId,
        key,
        publicUrl: `${PUBLIC_URL}/${key}`
      }
    });
  } catch (error) {
    logger.error('Get poster upload URL error:', error);
    next(error);
  }
};

/**
 * Get signed URL for uploading cast image
 */
const getCastImageUploadUrl = async (req, res, next) => {
  try {
    const castImageId = uuidv4();
    const key = `cast/${castImageId}.jpg`;
    const url = await getSignedUploadUrl(key, 'image/jpeg', 3600);

    res.json({
      success: true,
      data: {
        uploadUrl: url,
        castImageId,
        key,
        publicUrl: `${PUBLIC_URL}/${key}`
      }
    });
  } catch (error) {
    logger.error('Get cast image upload URL error:', error);
    next(error);
  }
};

/**
 * Get signed URL for uploading video file (before encoding)
 */
const getVideoUploadUrl = async (req, res, next) => {
  try {
    const { contentType, contentId } = req.body; // contentType: 'movie' or 'episode'
    const videoId = uuidv4();
    const key = `videos/raw/${contentType}/${contentId || videoId}.mp4`;
    const url = await getSignedUploadUrl(key, 'video/mp4', 7200); // 2 hours for large files

    res.json({
      success: true,
      data: {
        uploadUrl: url,
        videoId,
        key,
        publicUrl: `${PUBLIC_URL}/${key}`,
        note: 'Upload video here, then use encode-hls script to process it'
      }
    });
  } catch (error) {
    logger.error('Get video upload URL error:', error);
    next(error);
  }
};

/**
 * Get signed URL for uploading subtitle
 */
const getSubtitleUploadUrl = async (req, res, next) => {
  try {
    const subtitleId = uuidv4();
    const key = getSubtitlePath(subtitleId);
    const url = await getSignedUploadUrl(key, 'text/vtt', 3600);

    res.json({
      success: true,
      data: {
        uploadUrl: url,
        subtitleId,
        key,
        publicUrl: `${PUBLIC_URL}/${key}`
      }
    });
  } catch (error) {
    logger.error('Get subtitle upload URL error:', error);
    next(error);
  }
};

/**
 * Get signed URL for uploading HLS manifest (after encoding)
 */
const getHLSManifestUploadUrl = async (req, res, next) => {
  try {
    const { contentType, contentId, quality, seasonId, episodeId } = req.body;
    
    if (contentType === 'movie') {
      const key = getVideoPath('movie', contentId, quality);
      const url = await getSignedUploadUrl(key, 'application/vnd.apple.mpegurl', 3600);
      
      res.json({
        success: true,
        data: {
          uploadUrl: url,
          key,
          publicUrl: `${PUBLIC_URL}/${key}`,
          note: 'Upload the master.m3u8 file here'
        }
      });
    } else if (contentType === 'episode') {
      if (!seasonId || !episodeId) {
        return res.status(400).json({
          success: false,
          message: 'seasonId and episodeId are required for episodes'
        });
      }
      
      const key = getVideoPath('episode', contentId, quality, seasonId, episodeId);
      const url = await getSignedUploadUrl(key, 'application/vnd.apple.mpegurl', 3600);
      
      res.json({
        success: true,
        data: {
          uploadUrl: url,
          key,
          publicUrl: `${PUBLIC_URL}/${key}`,
          note: 'Upload the master.m3u8 file here'
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid contentType. Use "movie" or "episode"'
      });
    }
  } catch (error) {
    logger.error('Get HLS manifest upload URL error:', error);
    next(error);
  }
};

/**
 * Get signed URL for uploading HLS segment (.ts files)
 */
const getHLSSegmentUploadUrl = async (req, res, next) => {
  try {
    const { contentType, contentId, quality, segmentName, seasonId, episodeId } = req.body;
    
    let baseKey;
    if (contentType === 'movie') {
      baseKey = getVideoPath('movie', contentId, quality);
    } else if (contentType === 'episode') {
      if (!seasonId || !episodeId) {
        return res.status(400).json({
          success: false,
          message: 'seasonId and episodeId are required for episodes'
        });
      }
      baseKey = getVideoPath('episode', contentId, quality, seasonId, episodeId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid contentType'
      });
    }
    
    // Replace index.m3u8 with segment name
    const key = baseKey.replace('index.m3u8', segmentName);
    const url = await getSignedUploadUrl(key, 'video/mp2t', 3600);
    
    res.json({
      success: true,
      data: {
        uploadUrl: url,
        key,
        publicUrl: `${PUBLIC_URL}/${key}`
      }
    });
  } catch (error) {
    logger.error('Get HLS segment upload URL error:', error);
    next(error);
  }
};

/**
 * Bulk upload URLs for multiple files
 */
const getBulkUploadUrls = async (req, res, next) => {
  try {
    const { files } = req.body; // Array of { type, contentType, contentId, quality, etc. }
    
    const uploadUrls = [];
    
    for (const file of files) {
      let key, contentType, url;
      
      switch (file.type) {
        case 'thumbnail':
          key = getThumbnailPath(uuidv4());
          contentType = 'image/jpeg';
          break;
        case 'poster':
          key = `posters/${uuidv4()}.jpg`;
          contentType = 'image/jpeg';
          break;
        case 'cast':
          key = `cast/${uuidv4()}.jpg`;
          contentType = 'image/jpeg';
          break;
        case 'subtitle':
          key = getSubtitlePath(uuidv4());
          contentType = 'text/vtt';
          break;
        case 'video':
          key = `videos/raw/${file.contentType}/${file.contentId || uuidv4()}.mp4`;
          contentType = 'video/mp4';
          break;
        case 'hls-manifest':
          if (file.contentType === 'movie') {
            key = getVideoPath('movie', file.contentId, file.quality);
          } else {
            key = getVideoPath('episode', file.contentId, file.quality, file.seasonId, file.episodeId);
          }
          contentType = 'application/vnd.apple.mpegurl';
          break;
        default:
          continue;
      }
      
      url = await getSignedUploadUrl(key, contentType, 3600);
      
      uploadUrls.push({
        type: file.type,
        uploadUrl: url,
        key,
        publicUrl: `${PUBLIC_URL}/${key}`
      });
    }
    
    res.json({
      success: true,
      data: uploadUrls
    });
  } catch (error) {
    logger.error('Get bulk upload URLs error:', error);
    next(error);
  }
};

module.exports = {
  getThumbnailUploadUrl,
  getPosterUploadUrl,
  getCastImageUploadUrl,
  getVideoUploadUrl,
  getSubtitleUploadUrl,
  getHLSManifestUploadUrl,
  getHLSSegmentUploadUrl,
  getBulkUploadUrls
};

