const { uploadToR2, getVideoPath, getThumbnailPath, getSubtitlePath } = require('../src/config/r2');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');

/**
 * Upload HLS files to Cloudflare R2
 * @param {string} localDir - Local directory containing HLS files
 * @param {string} type - 'movie' or 'episode'
 * @param {string} contentId - Content ID
 * @param {string} quality - Quality level (optional, if uploading single quality)
 * @param {string} seasonId - Season ID (for episodes)
 * @param {string} episodeId - Episode ID (for episodes)
 */
async function uploadHLSToR2(localDir, type, contentId, quality = null, seasonId = null, episodeId = null) {
  try {
    const uploadedFiles = [];

    if (quality) {
      // Upload single quality
      const qualityDir = path.join(localDir, quality);
      const files = await fs.readdir(qualityDir);

      for (const file of files) {
        const filePath = path.join(qualityDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          const fileBuffer = await fs.readFile(filePath);
          const r2Key = type === 'movie'
            ? getVideoPath('movie', contentId, quality)
            : getVideoPath('episode', contentId, quality, seasonId, episodeId);

          // Adjust key for segments
          const key = file.endsWith('.m3u8')
            ? r2Key
            : r2Key.replace('index.m3u8', file);

          const contentType = file.endsWith('.m3u8')
            ? 'application/vnd.apple.mpegurl'
            : 'video/mp2t';

          const result = await uploadToR2(fileBuffer, key, contentType);
          uploadedFiles.push(result);
          logger.info(`Uploaded: ${key}`);
        }
      }
    } else {
      // Upload all qualities
      const qualities = await fs.readdir(localDir);

      for (const quality of qualities) {
        const qualityDir = path.join(localDir, quality);
        const stats = await fs.stat(qualityDir);

        if (stats.isDirectory()) {
          const files = await fs.readdir(qualityDir);

          for (const file of files) {
            const filePath = path.join(qualityDir, file);
            const fileStats = await fs.stat(filePath);

            if (fileStats.isFile()) {
              const fileBuffer = await fs.readFile(filePath);
              const r2Key = type === 'movie'
                ? getVideoPath('movie', contentId, quality)
                : getVideoPath('episode', contentId, quality, seasonId, episodeId);

              const key = file.endsWith('.m3u8')
                ? r2Key
                : r2Key.replace('index.m3u8', file);

              const contentType = file.endsWith('.m3u8')
                ? 'application/vnd.apple.mpegurl'
                : 'video/mp2t';

              const result = await uploadToR2(fileBuffer, key, contentType);
              uploadedFiles.push(result);
              logger.info(`Uploaded: ${key}`);
            }
          }
        }
      }
    }

    return {
      success: true,
      uploadedFiles,
      count: uploadedFiles.length
    };
  } catch (error) {
    logger.error('Upload to R2 error:', error);
    throw error;
  }
}

/**
 * Upload thumbnail to R2
 */
async function uploadThumbnail(localPath, thumbnailId) {
  try {
    const fileBuffer = await fs.readFile(localPath);
    const key = getThumbnailPath(thumbnailId);
    const result = await uploadToR2(fileBuffer, key, 'image/jpeg');

    return result;
  } catch (error) {
    logger.error('Upload thumbnail error:', error);
    throw error;
  }
}

/**
 * Upload subtitle to R2
 */
async function uploadSubtitle(localPath, subtitleId) {
  try {
    const fileBuffer = await fs.readFile(localPath);
    const key = getSubtitlePath(subtitleId);
    const result = await uploadToR2(fileBuffer, key, 'text/vtt');

    return result;
  } catch (error) {
    logger.error('Upload subtitle error:', error);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node upload-to-r2.js <local-dir> <type> <content-id> [quality] [season-id] [episode-id]');
    console.log('Example: node upload-to-r2.js ./output movie movie123');
    console.log('Example: node upload-to-r2.js ./output episode series123 1080p season456 episode789');
    process.exit(1);
  }

  const [localDir, type, contentId, quality, seasonId, episodeId] = args;

  uploadHLSToR2(localDir, type, contentId, quality, seasonId, episodeId)
    .then(result => {
      console.log('Upload completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Upload failed:', error);
      process.exit(1);
    });
}

module.exports = {
  uploadHLSToR2,
  uploadThumbnail,
  uploadSubtitle
};

