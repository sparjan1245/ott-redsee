const mongoose = require('mongoose');

/**
 * Error Log Model - Stores all application errors (CloudWatch-like)
 * Allows querying and monitoring errors
 */
const errorLogSchema = new mongoose.Schema({
  // Error identification
  errorId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Error details
  message: {
    type: String,
    required: true,
    index: true
  },
  
  stack: {
    type: String
  },
  
  // Request context
  path: {
    type: String,
    required: true,
    index: true
  },
  
  method: {
    type: String,
    required: true,
    index: true
  },
  
  route: {
    type: String,
    index: true
  },
  
  // User context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    index: true
  },
  
  // Request details
  ip: {
    type: String,
    index: true
  },
  
  userAgent: {
    type: String
  },
  
  requestBody: {
    type: mongoose.Schema.Types.Mixed
  },
  
  queryParams: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Error classification
  statusCode: {
    type: Number,
    required: true,
    index: true
  },
  
  errorType: {
    type: String,
    enum: ['ValidationError', 'DatabaseError', 'AuthenticationError', 'AuthorizationError', 'NotFoundError', 'BusinessLogicError', 'ExternalServiceError', 'UnknownError'],
    default: 'UnknownError',
    index: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  // Environment
  environment: {
    type: String,
    default: process.env.NODE_ENV || 'development',
    index: true
  },
  
  // Resolution tracking
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  
  resolvedAt: {
    type: Date
  },
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  resolutionNote: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ route: 1, createdAt: -1 });
errorLogSchema.index({ errorType: 1, createdAt: -1 });
errorLogSchema.index({ severity: 1, createdAt: -1 });
errorLogSchema.index({ resolved: 1, createdAt: -1 });
errorLogSchema.index({ path: 1, method: 1, createdAt: -1 });

// Compound index for common queries
errorLogSchema.index({ environment: 1, resolved: 1, createdAt: -1 });

module.exports = mongoose.model('ErrorLog', errorLogSchema);

