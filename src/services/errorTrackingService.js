const ErrorLog = require('../models/ErrorLog');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Error Tracking Service - CloudWatch-like error storage and monitoring
 */
class ErrorTrackingService {
  /**
   * Classify error type
   * @param {Error} error - Error object
   * @returns {string} Error type
   */
  static classifyError(error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return 'ValidationError';
    }
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return 'DatabaseError';
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return 'AuthenticationError';
    }
    if (error.statusCode === 403) {
      return 'AuthorizationError';
    }
    if (error.statusCode === 404) {
      return 'NotFoundError';
    }
    if (error.statusCode >= 500) {
      return 'ExternalServiceError';
    }
    return 'UnknownError';
  }

  /**
   * Determine error severity
   * @param {Error} error - Error object
   * @param {string} errorType - Classified error type
   * @returns {string} Severity level
   */
  static determineSeverity(error, errorType) {
    if (errorType === 'DatabaseError' || errorType === 'ExternalServiceError') {
      return 'critical';
    }
    if (errorType === 'AuthenticationError' || errorType === 'AuthorizationError') {
      return 'high';
    }
    if (error.statusCode >= 500) {
      return 'high';
    }
    if (error.statusCode >= 400) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Store error in database
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Stored error log
   */
  static async logError(error, req, context = {}) {
    try {
      const errorId = uuidv4();
      const errorType = this.classifyError(error);
      const severity = this.determineSeverity(error, errorType);

      // Extract user info
      const userId = req.user?.id || req.user?._id || null;
      const adminId = req.admin?.id || req.admin?._id || null;

      // Extract request info
      const requestBody = req.body && Object.keys(req.body).length > 0 
        ? this.sanitizeRequestBody(req.body) 
        : null;

      const errorLog = new ErrorLog({
        errorId,
        message: error.message || 'Unknown error',
        stack: error.stack,
        path: req.originalUrl || req.path,
        method: req.method,
        route: context.route || req.route?.path || null,
        userId,
        adminId,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        requestBody,
        queryParams: Object.keys(req.query).length > 0 ? req.query : null,
        statusCode: error.statusCode || 500,
        errorType,
        severity,
        environment: process.env.NODE_ENV || 'development',
        metadata: context.metadata || {}
      });

      await errorLog.save();

      // Also log to Winston (existing logger)
      logger.error('Error logged to database', {
        errorId,
        path: req.originalUrl,
        method: req.method,
        errorType,
        severity
      });

      return errorLog;
    } catch (logError) {
      // Fallback: if error logging fails, at least log to Winston
      logger.error('Failed to log error to database:', logError);
      logger.error('Original error:', error);
      return null;
    }
  }

  /**
   * Sanitize request body (remove sensitive data)
   * @param {Object} body - Request body
   * @returns {Object} Sanitized body
   */
  static sanitizeRequestBody(body) {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * Get error logs with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated error logs
   */
  static async getErrorLogs(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sort = { createdAt: -1 }
      } = options;

      const query = {};

      // Apply filters
      if (filters.route) query.route = filters.route;
      if (filters.errorType) query.errorType = filters.errorType;
      if (filters.severity) query.severity = filters.severity;
      if (filters.resolved !== undefined) query.resolved = filters.resolved;
      if (filters.environment) query.environment = filters.environment;
      if (filters.path) query.path = { $regex: filters.path, $options: 'i' };
      if (filters.method) query.method = filters.method;
      if (filters.userId) query.userId = filters.userId;
      if (filters.adminId) query.adminId = filters.adminId;
      
      // Date range
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        ErrorLog.find(query)
          .populate('userId', 'name email')
          .populate('adminId', 'name email')
          .sort(sort)
          .limit(limit)
          .skip(skip)
          .lean(),
        ErrorLog.countDocuments(query)
      ]);

      return {
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('ErrorTrackingService.getErrorLogs error:', error);
      throw error;
    }
  }

  /**
   * Get error statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Error statistics
   */
  static async getErrorStatistics(filters = {}) {
    try {
      const query = {};

      if (filters.environment) query.environment = filters.environment;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const [
        totalErrors,
        byType,
        bySeverity,
        byRoute,
        unresolved
      ] = await Promise.all([
        ErrorLog.countDocuments(query),
        ErrorLog.aggregate([
          { $match: query },
          { $group: { _id: '$errorType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        ErrorLog.aggregate([
          { $match: query },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        ErrorLog.aggregate([
          { $match: query },
          { $group: { _id: '$route', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        ErrorLog.countDocuments({ ...query, resolved: false })
      ]);

      return {
        totalErrors,
        unresolved,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topRoutes: byRoute.map(item => ({
          route: item._id || 'Unknown',
          count: item.count
        }))
      };
    } catch (error) {
      logger.error('ErrorTrackingService.getErrorStatistics error:', error);
      throw error;
    }
  }

  /**
   * Mark error as resolved
   * @param {string} errorId - Error ID
   * @param {string} adminId - Admin ID who resolved it
   * @param {string} note - Resolution note
   * @returns {Promise<Object>} Updated error log
   */
  static async resolveError(errorId, adminId, note = '') {
    try {
      const errorLog = await ErrorLog.findOneAndUpdate(
        { errorId },
        {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: adminId,
          resolutionNote: note
        },
        { new: true }
      );

      if (!errorLog) {
        throw new Error('Error log not found');
      }

      return errorLog;
    } catch (error) {
      logger.error('ErrorTrackingService.resolveError error:', error);
      throw error;
    }
  }
}

module.exports = ErrorTrackingService;

