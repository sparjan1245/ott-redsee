const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['trending', 'continue_watching', 'kids', 'new_releases', 'popular', 'custom'],
    required: true
  },
  contentType: {
    type: String,
    enum: ['movie', 'series', 'both'],
    default: 'both'
  },
  items: [{
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'items.contentType'
    },
    contentType: {
      type: String,
      enum: ['Movie', 'Series'],
      required: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
sectionSchema.index({ type: 1, isActive: 1 });
sectionSchema.index({ sortOrder: 1 });

module.exports = mongoose.model('Section', sectionSchema);

