const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

// Configure AWS SDK v3 for Cloudflare R2 (S3 Compatible)
const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  },
  forcePathStyle: true // Required for R2
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;
const ENDPOINT = process.env.R2_ENDPOINT;
console.log("PUBLIC_URL",PUBLIC_URL);
console.log("ENDPOINT",ENDPOINT);
// Validate R2 configuration
const requiredR2Vars = {
  R2_BUCKET_NAME: BUCKET_NAME,
  R2_PUBLIC_URL: PUBLIC_URL,
  R2_ENDPOINT: ENDPOINT,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY
};

const missingVars = Object.entries(requiredR2Vars)
  .filter(([key, value]) => !value || value.includes('your-') || value.includes('yourdomain'))
  .map(([key]) => key);

if (missingVars.length > 0) {
  logger.warn('⚠️  Cloudflare R2 configuration is incomplete or using template values!');
  logger.warn(`Missing or invalid variables: ${missingVars.join(', ')}`);
  logger.warn('Please update your .env file with actual R2 credentials.');
  logger.warn('See docs/R2_SETUP.md for setup instructions.');
}

/**
 * Generate signed URL for uploading
 * @param {string} key - Object key in R2
 * @param {string} contentType - MIME type
 * @param {number} expiresIn - Expiration in seconds (default: 3600)
 * @returns {Promise<string>} Signed URL
 */
const getSignedUploadUrl = async (key, contentType, expiresIn = 3600) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('Error generating signed upload URL:', error);
    throw error;
  }
};

/**
 * Generate signed URL for downloading/streaming
 * @param {string} key - Object key in R2
 * @param {number} expiresIn - Expiration in seconds (default: 3600)
 * @returns {Promise<string>} Signed URL
 */
const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const url = await getSignedUrl(s3, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('Error generating signed download URL:', error);
    throw error;
  }
};

/**
 * Upload file directly to R2
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - Object key
 * @param {string} contentType - MIME type
 * @returns {Promise<Object>} Upload result
 */
const uploadToR2 = async (fileBuffer, key, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType
    });

    await s3.send(command);
    return {
      key: key,
      url: `${PUBLIC_URL}/${key}`,
      location: `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`
    };
  } catch (error) {
    logger.error('Error uploading to R2:', error);
    throw error;
  }
};

/**
 * Delete file from R2
 * @param {string} key - Object key
 * @returns {Promise<Object>} Delete result
 */
const deleteFromR2 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const result = await s3.send(command);
    return result;
  } catch (error) {
    logger.error('Error deleting from R2:', error);
    throw error;
  }
};

/**
 * Generate R2 path for video content
 * @param {string} type - 'movie' or 'episode'
 * @param {string} contentId - Content ID
 * @param {string} quality - Quality level (optional, for backward compatibility)
 * @param {string} seasonId - Season ID (for episodes)
 * @param {string} episodeId - Episode ID (for episodes)
 * @returns {string} R2 key path
 */
const getVideoPath = (type, contentId, quality = null, seasonId = null, episodeId = null) => {
  if (type === 'movie') {
    // If quality is provided, use old path structure (for backward compatibility)
    // Otherwise, use simple single video path
    if (quality) {
      return `movies/${contentId}/${quality}/index.m3u8`;
    }
    return `movies/${contentId}/video.mp4`;
  } else if (type === 'episode') {
    // If quality is provided, use old path structure (for backward compatibility)
    // Otherwise, use simple single video path
    if (quality) {
      return `series/${contentId}/${seasonId}/${episodeId}/${quality}/index.m3u8`;
    }
    return `series/${contentId}/${seasonId}/${episodeId}/video.mp4`;
  }
  throw new Error('Invalid video type');
};

/**
 * Generate R2 path for subtitles
 * @param {string} subtitleId - Subtitle ID
 * @returns {string} R2 key path
 */
const getSubtitlePath = (subtitleId) => {
  return `subtitles/${subtitleId}.vtt`;
};

/**
 * Generate R2 path for thumbnails
 * @param {string} thumbnailId - Thumbnail ID
 * @returns {string} R2 key path
 */
const getThumbnailPath = (thumbnailId) => {
  return `thumbnails/${thumbnailId}.jpg`;
};

module.exports = {
  s3,
  BUCKET_NAME,
  PUBLIC_URL,
  getSignedUploadUrl,
  getSignedDownloadUrl,
  uploadToR2,
  deleteFromR2,
  getVideoPath,
  getSubtitlePath,
  getThumbnailPath
};

