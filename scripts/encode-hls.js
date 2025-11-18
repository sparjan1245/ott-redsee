const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../src/utils/logger');

/**
 * FFmpeg HLS Multi-Quality Encoding Script
 * 
 * This script encodes a video file into multiple quality levels
 * and generates HLS (.m3u8) playlists for adaptive streaming.
 * 
 * Quality Levels: 240p, 360p, 480p, 720p, 1080p, 4K
 */

const QUALITIES = [
  { name: '240p', width: 426, height: 240, bitrate: '400k', audioBitrate: '64k' },
  { name: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' },
  { name: '480p', width: 854, height: 480, bitrate: '1400k', audioBitrate: '128k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2800k', audioBitrate: '128k' },
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' },
  { name: '4K', width: 3840, height: 2160, bitrate: '20000k', audioBitrate: '192k' }
];

/**
 * Encode video to HLS format with multiple qualities
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Output directory for HLS files
 * @param {string} contentId - Content ID (movie/episode ID)
 * @param {Array} qualities - Array of quality names to encode (default: all)
 */
async function encodeHLS(inputPath, outputDir, contentId, qualities = QUALITIES.map(q => q.name)) {
  try {
    // Check if input file exists
    await fs.access(inputPath);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Filter qualities to encode
    const qualitiesToEncode = QUALITIES.filter(q => qualities.includes(q.name));

    // Create master playlist
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    // Encode each quality
    for (const quality of qualitiesToEncode) {
      const qualityDir = path.join(outputDir, quality.name);
      await fs.mkdir(qualityDir, { recursive: true });

      const outputPath = path.join(qualityDir, 'index.m3u8');
      const segmentPath = path.join(qualityDir, 'segment_%03d.ts');

      // FFmpeg command for HLS encoding
      const ffmpegCommand = `ffmpeg -i "${inputPath}" \
        -c:v libx264 -preset slow -crf 22 \
        -maxrate ${quality.bitrate} -bufsize ${parseInt(quality.bitrate) * 2}k \
        -vf scale=${quality.width}:${quality.height}:force_original_aspect_ratio=decrease,pad=${quality.width}:${quality.height}:(ow-iw)/2:(oh-ih)/2 \
        -c:a aac -b:a ${quality.audioBitrate} -ac 2 \
        -f hls -hls_time 10 -hls_list_size 0 \
        -hls_segment_filename "${segmentPath}" \
        -hls_flags independent_segments \
        "${outputPath}"`;

      logger.info(`Encoding ${quality.name}...`);

      await new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            logger.error(`FFmpeg error for ${quality.name}:`, error);
            reject(error);
            return;
          }
          logger.info(`${quality.name} encoding completed`);
          resolve();
        });
      });

      // Add to master playlist
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(quality.bitrate) * 1000},RESOLUTION=${quality.width}x${quality.height}\n`;
      masterPlaylist += `${quality.name}/index.m3u8\n\n`;
    }

    // Write master playlist
    await fs.writeFile(masterPlaylistPath, masterPlaylist);
    logger.info(`Master playlist created: ${masterPlaylistPath}`);

    return {
      success: true,
      masterPlaylist: masterPlaylistPath,
      qualities: qualitiesToEncode.map(q => q.name)
    };
  } catch (error) {
    logger.error('HLS encoding error:', error);
    throw error;
  }
}

/**
 * Encode single quality (for incremental encoding)
 */
async function encodeSingleQuality(inputPath, outputDir, qualityName) {
  const quality = QUALITIES.find(q => q.name === qualityName);
  if (!quality) {
    throw new Error(`Invalid quality: ${qualityName}`);
  }

  const qualityDir = path.join(outputDir, qualityName);
  await fs.mkdir(qualityDir, { recursive: true });

  const outputPath = path.join(qualityDir, 'index.m3u8');
  const segmentPath = path.join(qualityDir, 'segment_%03d.ts');

  const ffmpegCommand = `ffmpeg -i "${inputPath}" \
    -c:v libx264 -preset slow -crf 22 \
    -maxrate ${quality.bitrate} -bufsize ${parseInt(quality.bitrate) * 2}k \
    -vf scale=${quality.width}:${quality.height}:force_original_aspect_ratio=decrease,pad=${quality.width}:${quality.height}:(ow-iw)/2:(oh-ih)/2 \
    -c:a aac -b:a ${quality.audioBitrate} -ac 2 \
    -f hls -hls_time 10 -hls_list_size 0 \
    -hls_segment_filename "${segmentPath}" \
    -hls_flags independent_segments \
    "${outputPath}"`;

  return new Promise((resolve, reject) => {
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ outputPath, qualityDir });
    });
  });
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node encode-hls.js <input-video> <output-dir> <content-id> [qualities]');
    console.log('Example: node encode-hls.js video.mp4 ./output movie123 240p,360p,480p,720p,1080p');
    process.exit(1);
  }

  const [inputPath, outputDir, contentId, qualitiesArg] = args;
  const qualities = qualitiesArg ? qualitiesArg.split(',') : QUALITIES.map(q => q.name);

  encodeHLS(inputPath, outputDir, contentId, qualities)
    .then(result => {
      console.log('Encoding completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Encoding failed:', error);
      process.exit(1);
    });
}

module.exports = {
  encodeHLS,
  encodeSingleQuality,
  QUALITIES
};

