const { getSignedUploadUrl, PUBLIC_URL, getThumbnailPath, getSubtitlePath, getVideoPath } = require('../config/r2');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Upload Service - Centralized R2 upload URL generation
 * Handles all file upload types with consistent response format
 */
class UploadService {
  // Upload type configurations
  static UPLOAD_TYPES = {
    THUMBNAIL: 'thumbnail',
    POSTER: 'poster',
    CAST_IMAGE: 'cast-image',
    VIDEO: 'video',
    SUBTITLE: 'subtitle',
    HLS_MANIFEST: 'hls-manifest',
    HLS_SEGMENT: 'hls-segment'
  };

  // Content type mappings
  static CONTENT_TYPES = {
    'thumbnail': 'image/jpeg',
    'poster': 'image/jpeg',
    'cast-image': 'image/jpeg',
    'video': 'video/mp4',
    'subtitle': 'text/vtt',
    'hls-manifest': 'application/vnd.apple.mpegurl',
    'hls-segment': 'video/mp2t'
  };

  // File size limits (in bytes)
  static SIZE_LIMITS = {
    'thumbnail': 5 * 1024 * 1024,      // 5MB
    'poster': 10 * 1024 * 1024,         // 10MB
    'cast-image': 5 * 1024 * 1024,      // 5MB
    'video': 10 * 1024 * 1024 * 1024,   // 10GB
    'subtitle': 1 * 1024 * 1024,        // 1MB
    'hls-manifest': 100 * 1024,         // 100KB
    'hls-segment': 10 * 1024 * 1024     // 10MB
  };

  // Expiration times (in seconds)
  static EXPIRATION = {
    'thumbnail': 3600,      // 1 hour
    'poster': 3600,          // 1 hour
    'cast-image': 3600,      // 1 hour
    'video': 7200,           // 2 hours (large files)
    'subtitle': 3600,        // 1 hour
    'hls-manifest': 3600,    // 1 hour
    'hls-segment': 3600      // 1 hour
  };

  /**
   * Generate R2 key path based on upload type
   * @param {string} type - Upload type
   * @param {Object} params - Type-specific parameters
   * @returns {string} R2 key path
   */
  static generateKey(type, params = {}) {
    const { id, contentType, contentId, quality, seasonId, episodeId, segmentName } = params;

    switch (type) {
      case this.UPLOAD_TYPES.THUMBNAIL:
        return getThumbnailPath(id || uuidv4());

      case this.UPLOAD_TYPES.POSTER:
        return `posters/${id || uuidv4()}.jpg`;

      case this.UPLOAD_TYPES.CAST_IMAGE:
        return `cast/${id || uuidv4()}.jpg`;

      case this.UPLOAD_TYPES.VIDEO:
        return `videos/raw/${contentType || 'movie'}/${contentId || uuidv4()}.mp4`;

      case this.UPLOAD_TYPES.SUBTITLE:
        return getSubtitlePath(id || uuidv4());

      case this.UPLOAD_TYPES.HLS_MANIFEST:
        if (contentType === 'movie') {
          return getVideoPath('movie', contentId, quality);
        } else if (contentType === 'episode') {
          if (!seasonId || !episodeId) {
            throw new Error('seasonId and episodeId are required for episode HLS manifests');
          }
          return getVideoPath('episode', contentId, quality, seasonId, episodeId);
        }
        throw new Error('Invalid contentType for HLS manifest. Use "movie" or "episode"');

      case this.UPLOAD_TYPES.HLS_SEGMENT:
        if (contentType === 'movie') {
          const baseKey = getVideoPath('movie', contentId, quality);
          return baseKey.replace('index.m3u8', segmentName);
        } else if (contentType === 'episode') {
          if (!seasonId || !episodeId) {
            throw new Error('seasonId and episodeId are required for episode HLS segments');
          }
          const baseKey = getVideoPath('episode', contentId, quality, seasonId, episodeId);
          return baseKey.replace('index.m3u8', segmentName);
        }
        throw new Error('Invalid contentType for HLS segment');

      default:
        throw new Error(`Unknown upload type: ${type}`);
    }
  }

  /**
   * Get upload URL for a single file
   * @param {string} type - Upload type
   * @param {Object} params - Type-specific parameters
   * @returns {Promise<Object>} Upload URL response
   */
  static async getUploadUrl(type, params = {}) {
    try {
      // Validate type
      if (!Object.values(this.UPLOAD_TYPES).includes(type)) {
        throw new Error(`Invalid upload type: ${type}`);
      }

      // Generate unique ID if not provided
      const fileId = params.id || uuidv4();

      // Generate R2 key
      const key = this.generateKey(type, { ...params, id: fileId });

      // Get content type
      const contentType = this.CONTENT_TYPES[type];
      if (!contentType) {
        throw new Error(`No content type defined for: ${type}`);
      }

      // Get expiration
      const expiresIn = this.EXPIRATION[type] || 3600;

      // Generate signed URL
      const uploadUrl = await getSignedUploadUrl(key, contentType, expiresIn);

      // Build response
      const response = {
        uploadUrl,
        key,
        publicUrl: `${PUBLIC_URL}/${key}`,
        id: fileId
      };

      // Add type-specific fields
      if (type === this.UPLOAD_TYPES.HLS_MANIFEST) {
        response.note = 'Upload the master.m3u8 file here';
      } else if (type === this.UPLOAD_TYPES.VIDEO) {
        response.note = 'Upload video here, then use encode-hls script to process it';
      }

      return response;
    } catch (error) {
      logger.error(`UploadService.getUploadUrl error [${type}]:`, error);
      throw error;
    }
  }

  /**
   * Get bulk upload URLs for multiple files
   * @param {Array} files - Array of { type, ...params }
   * @returns {Promise<Array>} Array of upload URL responses
   */
  static async getBulkUploadUrls(files) {
    try {
      if (!Array.isArray(files) || files.length === 0) {
        throw new Error('Files array is required and must not be empty');
      }

      // Limit bulk requests
      if (files.length > 50) {
        throw new Error('Maximum 50 files per bulk request');
      }

      const uploadUrls = await Promise.all(
        files.map(async (file) => {
          try {
            const { type, ...params } = file;
            const result = await this.getUploadUrl(type, params);
            return {
              type,
              ...result
            };
          } catch (error) {
            logger.error(`Bulk upload error for type ${file.type}:`, error);
            return {
              type: file.type,
              error: error.message
            };
          }
        })
      );

      return uploadUrls;
    } catch (error) {
      logger.error('UploadService.getBulkUploadUrls error:', error);
      throw error;
    }
  }

  /**
   * Validate file type
   * @param {string} type - Upload type
   * @param {string} mimeType - MIME type to validate
   * @returns {boolean} Is valid
   */
  static validateFileType(type, mimeType) {
    const expectedType = this.CONTENT_TYPES[type];
    if (!expectedType) return false;

    // Allow variations (e.g., image/jpeg, image/jpg)
    if (expectedType.startsWith('image/')) {
      return mimeType.startsWith('image/');
    }
    if (expectedType.startsWith('video/')) {
      return mimeType.startsWith('video/');
    }
    if (expectedType.startsWith('text/')) {
      return mimeType.startsWith('text/') || mimeType === 'application/vnd.apple.mpegurl';
    }

    return mimeType === expectedType;
  }

  /**
   * Validate file size
   * @param {string} type - Upload type
   * @param {number} size - File size in bytes
   * @returns {boolean} Is valid
   */
  static validateFileSize(type, size) {
    const limit = this.SIZE_LIMITS[type];
    if (!limit) return true; // No limit defined
    return size <= limit;
  }
}

module.exports = UploadService;

