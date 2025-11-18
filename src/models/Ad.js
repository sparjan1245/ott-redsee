const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['pre_roll', 'mid_roll', 'post_roll', 'banner'],
    required: true
  },
  videoUrl: {
    type: String, // R2 URL or external URL
    required: function() {
      return this.type !== 'banner';
    }
  },
  imageUrl: {
    type: String, // R2 URL (for banner ads)
    required: function() {
      return this.type === 'banner';
    }
  },
  clickUrl: {
    type: String // Redirect URL when ad is clicked
  },
  duration: {
    type: Number, // Duration in seconds (for video ads)
    required: function() {
      return this.type !== 'banner';
    }
  },
  targetAudience: {
    ageGroups: [String],
    regions: [String],
    devices: [String]
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
adSchema.index({ type: 1, isActive: 1 });
adSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Ad', adSchema);

