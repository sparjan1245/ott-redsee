const ErrorTrackingService = require('../services/errorTrackingService');
const logger = require('../utils/logger');

/**
 * Route Wrapper - Isolates each route with individual error handling
 * If one route fails, it doesn't affect other routes
 * 
 * @param {Function} handler - Route handler function
 * @param {Object} options - Wrapper options
 * @returns {Function} Wrapped route handler
 */
const routeWrapper = (handler, options = {}) => {
  const {
    routeName = 'unknown',
    skipErrorLogging = false,
    customErrorHandler = null
  } = options;

  return async (req, res, next) => {
    try {
      // Add route name to request context
      req.routeContext = {
        route: routeName,
        ...req.routeContext
      };

      // Execute the handler
      await handler(req, res, next);
    } catch (error) {
      // Log error to database (CloudWatch-like)
      if (!skipErrorLogging) {
        try {
          await ErrorTrackingService.logError(error, req, {
            route: routeName,
            metadata: options.metadata || {}
          });
        } catch (logError) {
          // If error logging fails, at least log to Winston
          logger.error(`Failed to log error for route ${routeName}:`, logError);
        }
      }

      // Use custom error handler if provided
      if (customErrorHandler) {
        return customErrorHandler(error, req, res, next);
      }

      // Default error handling
      const statusCode = error.statusCode || error.status || 500;
      const message = error.message || 'Internal server error';

      // Don't expose stack trace in production
      const response = {
        success: false,
        message,
        route: routeName,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          error: error.name
        })
      };

      // Add error ID if available (from error tracking)
      if (error.errorId) {
        response.errorId = error.errorId;
      }

      res.status(statusCode).json(response);

      // Log to console for debugging
      logger.error(`Route error [${routeName}]:`, {
        message,
        path: req.originalUrl,
        method: req.method,
        statusCode
      });
    }
  };
};

/**
 * Async handler wrapper - Automatically catches async errors
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Combine route wrapper with async handler
 * @param {Function} handler - Route handler
 * @param {Object} options - Wrapper options
 * @returns {Function} Fully wrapped handler
 */
const safeRoute = (handler, options = {}) => {
  return routeWrapper(asyncHandler(handler), options);
};

module.exports = {
  routeWrapper,
  asyncHandler,
  safeRoute
};

