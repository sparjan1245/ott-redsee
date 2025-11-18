const ErrorTrackingService = require('../services/errorTrackingService');
const logger = require('../utils/logger');

/**
 * Enhanced Error Handler - Stores errors in database (CloudWatch-like)
 * Provides better error tracking and monitoring
 */

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.name = 'NotFoundError';
  res.status(404);
  next(error);
};

/**
 * Global error handler with database logging
 */
const errorHandler = async (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log error to database (CloudWatch-like)
  let errorLog = null;
  try {
    errorLog = await ErrorTrackingService.logError(err, req, {
      route: req.route?.path || req.path,
      metadata: {
        originalStatusCode: res.statusCode,
        finalStatusCode: statusCode
      }
    });
  } catch (logError) {
    // If error logging fails, at least log to Winston
    logger.error('Failed to log error to database:', logError);
  }

  // Prepare error response
  const response = {
    success: false,
    message: err.message || 'Internal server error',
    ...(errorLog && { errorId: errorLog.errorId }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err.name
    })
  };

  // Log to Winston (existing logger)
  logger.error('Global error handler:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    statusCode,
    errorId: errorLog?.errorId
  });

  res.status(statusCode).json(response);
};

/**
 * Unhandled rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log to database if possible
  if (reason instanceof Error) {
    ErrorTrackingService.logError(reason, {
      originalUrl: 'unhandledRejection',
      method: 'SYSTEM',
      path: 'unhandledRejection'
    }, {
      route: 'system',
      metadata: {
        type: 'unhandledRejection',
        promise: promise.toString()
      }
    }).catch(err => {
      logger.error('Failed to log unhandled rejection:', err);
    });
  }
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  
  // Log to database if possible
  ErrorTrackingService.logError(error, {
    originalUrl: 'uncaughtException',
    method: 'SYSTEM',
    path: 'uncaughtException'
  }, {
    route: 'system',
    metadata: {
      type: 'uncaughtException'
    }
  }).catch(err => {
    logger.error('Failed to log uncaught exception:', err);
  });

  // Exit process after logging
  process.exit(1);
});

module.exports = {
  notFound,
  errorHandler
};

