const { body, query, param } = require('express-validator');

/**
 * Validation schemas for content endpoints
 */

// Movie validators
const validateCreateMovie = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  
  body('genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array')
    .custom((genres) => {
      if (genres.length === 0) {
        throw new Error('At least one genre is required');
      }
      return true;
    }),
  
  body('releaseDate')
    .notEmpty()
    .withMessage('Release date is required')
    .isISO8601()
    .withMessage('Release date must be a valid date'),
  
  body('duration')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1, max: 600 })
    .withMessage('Duration must be between 1 and 600 minutes'),
  
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Rating must be between 0 and 10'),
  
  body('ageRating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A'])
    .withMessage('Invalid age rating'),
  
  body('language')
    .notEmpty()
    .withMessage('Language is required')
    .isMongoId()
    .withMessage('Language must be a valid ObjectId'),
  
  body('thumbnail')
    .notEmpty()
    .withMessage('Thumbnail URL is required')
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),
  
  body('poster')
    .notEmpty()
    .withMessage('Poster URL is required')
    .isURL()
    .withMessage('Poster must be a valid URL'),
  
  body('trailer')
    .optional()
    .isURL()
    .withMessage('Trailer must be a valid URL'),
  
  body('cast')
    .optional()
    .isArray()
    .withMessage('Cast must be an array')
    .custom((cast) => {
      if (cast.length > 0) {
        cast.forEach((member) => {
          if (!member.castId || !member.role) {
            throw new Error('Each cast member must have castId and role');
          }
        });
      }
      return true;
    }),
  
  body('director')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Director name must be less than 100 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean')
];

const validateUpdateMovie = [
  param('id')
    .isMongoId()
    .withMessage('Invalid movie ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  
  body('genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array'),
  
  body('releaseDate')
    .optional()
    .isISO8601()
    .withMessage('Release date must be a valid date'),
  
  body('duration')
    .optional()
    .isInt({ min: 1, max: 600 })
    .withMessage('Duration must be between 1 and 600 minutes'),
  
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Rating must be between 0 and 10'),
  
  body('ageRating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A'])
    .withMessage('Invalid age rating'),
  
  body('language')
    .optional()
    .isMongoId()
    .withMessage('Language must be a valid ObjectId'),
  
  body('thumbnail')
    .optional()
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),
  
  body('poster')
    .optional()
    .isURL()
    .withMessage('Poster must be a valid URL'),
  
  body('trailer')
    .optional()
    .isURL()
    .withMessage('Trailer must be a valid URL'),
  
  body('cast')
    .optional()
    .isArray()
    .withMessage('Cast must be an array'),
  
  body('director')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Director name must be less than 100 characters')
];

// Series validators (similar structure)
const validateCreateSeries = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  
  body('genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array'),
  
  body('releaseDate')
    .notEmpty()
    .withMessage('Release date is required')
    .isISO8601()
    .withMessage('Release date must be a valid date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Rating must be between 0 and 10'),
  
  body('ageRating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A'])
    .withMessage('Invalid age rating'),
  
  body('language')
    .notEmpty()
    .withMessage('Language is required')
    .isMongoId()
    .withMessage('Language must be a valid ObjectId'),
  
  body('thumbnail')
    .notEmpty()
    .withMessage('Thumbnail URL is required')
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),
  
  body('poster')
    .notEmpty()
    .withMessage('Poster URL is required')
    .isURL()
    .withMessage('Poster must be a valid URL'),
  
  body('cast')
    .optional()
    .isArray()
    .withMessage('Cast must be an array')
];

// Upload validators
const validateUploadRequest = [
  body('type')
    .notEmpty()
    .withMessage('Upload type is required')
    .isIn(['thumbnail', 'poster', 'cast-image', 'video', 'subtitle', 'hls-manifest', 'hls-segment'])
    .withMessage('Invalid upload type'),
  
  body('contentType')
    .if(body('type').equals('video').or(body('type').equals('hls-manifest')).or(body('type').equals('hls-segment')))
    .notEmpty()
    .withMessage('contentType is required for video/HLS uploads')
    .isIn(['movie', 'episode'])
    .withMessage('contentType must be "movie" or "episode"'),
  
  body('contentId')
    .if(body('type').equals('video').or(body('type').equals('hls-manifest')).or(body('type').equals('hls-segment')))
    .notEmpty()
    .withMessage('contentId is required for video/HLS uploads')
    .isMongoId()
    .withMessage('contentId must be a valid ObjectId'),
  
  body('quality')
    .if(body('type').equals('hls-manifest').or(body('type').equals('hls-segment')))
    .notEmpty()
    .withMessage('quality is required for HLS uploads')
    .isIn(['240p', '360p', '480p', '720p', '1080p', '4K'])
    .withMessage('Invalid quality. Use: 240p, 360p, 480p, 720p, 1080p, 4K'),
  
  body('segmentName')
    .if(body('type').equals('hls-segment'))
    .notEmpty()
    .withMessage('segmentName is required for HLS segment uploads')
    .matches(/^[a-zA-Z0-9_-]+\.ts$/)
    .withMessage('segmentName must be a valid .ts filename'),
  
  body('seasonId')
    .if(body('contentType').equals('episode'))
    .notEmpty()
    .withMessage('seasonId is required for episode uploads')
    .isMongoId()
    .withMessage('seasonId must be a valid ObjectId'),
  
  body('episodeId')
    .if(body('contentType').equals('episode'))
    .notEmpty()
    .withMessage('episodeId is required for episode uploads')
    .isMongoId()
    .withMessage('episodeId must be a valid ObjectId')
];

// Query validators
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be "true" or "false"')
];

module.exports = {
  validateCreateMovie,
  validateUpdateMovie,
  validateCreateSeries,
  validateUploadRequest,
  validatePagination
};

