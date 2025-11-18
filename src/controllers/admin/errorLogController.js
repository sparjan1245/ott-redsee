const ErrorTrackingService = require('../../services/errorTrackingService');
const logger = require('../../utils/logger');
const { safeRoute } = require('../../middleware/routeWrapper');

/**
 * Error Log Controller - Access error logs (CloudWatch-like)
 */

/**
 * Get error logs with filters
 */
const getErrorLogs = safeRoute(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    route,
    errorType,
    severity,
    resolved,
    environment,
    path,
    method,
    userId,
    adminId,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const filters = {
    route,
    errorType,
    severity,
    resolved: resolved !== undefined ? resolved === 'true' : undefined,
    environment: environment || process.env.NODE_ENV,
    path,
    method,
    userId,
    adminId,
    startDate,
    endDate
  };

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100), // Max 100 per page
    sort: {
      [sortBy]: sortOrder === 'desc' ? -1 : 1
    }
  };

  const result = await ErrorTrackingService.getErrorLogs(filters, options);

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination
  });
}, { routeName: 'admin.errorLogs.get' });

/**
 * Get error statistics
 */
const getErrorStatistics = safeRoute(async (req, res) => {
  const {
    environment,
    startDate,
    endDate
  } = req.query;

  const filters = {
    environment: environment || process.env.NODE_ENV,
    startDate,
    endDate
  };

  const statistics = await ErrorTrackingService.getErrorStatistics(filters);

  res.json({
    success: true,
    data: statistics
  });
}, { routeName: 'admin.errorLogs.statistics' });

/**
 * Get error by ID
 */
const getErrorById = safeRoute(async (req, res) => {
  const ErrorLog = require('../../models/ErrorLog');
  
  const errorLog = await ErrorLog.findOne({ errorId: req.params.id })
    .populate('userId', 'name email')
    .populate('adminId', 'name email')
    .populate('resolvedBy', 'name email')
    .lean();

  if (!errorLog) {
    return res.status(404).json({
      success: false,
      message: 'Error log not found'
    });
  }

  res.json({
    success: true,
    data: errorLog
  });
}, { routeName: 'admin.errorLogs.getById' });

/**
 * Resolve error
 */
const resolveError = safeRoute(async (req, res) => {
  const { errorId } = req.params;
  const { note } = req.body;
  const adminId = req.admin.id || req.admin._id;

  const errorLog = await ErrorTrackingService.resolveError(errorId, adminId, note);

  res.json({
    success: true,
    message: 'Error marked as resolved',
    data: errorLog
  });
}, { routeName: 'admin.errorLogs.resolve' });

/**
 * Get errors by route
 */
const getErrorsByRoute = safeRoute(async (req, res) => {
  const { route } = req.params;
  const { page = 1, limit = 50, resolved } = req.query;

  const filters = {
    route,
    resolved: resolved !== undefined ? resolved === 'true' : undefined
  };

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 }
  };

  const result = await ErrorTrackingService.getErrorLogs(filters, options);

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination
  });
}, { routeName: 'admin.errorLogs.getByRoute' });

module.exports = {
  getErrorLogs,
  getErrorStatistics,
  getErrorById,
  resolveError,
  getErrorsByRoute
};

