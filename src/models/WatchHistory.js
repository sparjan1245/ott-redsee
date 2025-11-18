const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentType'
  },
  contentType: {
    type: String,
    enum: ['Movie', 'Episode'],
    required: true
  },
  series: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Series'
  },
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season'
  },
  watchedDuration: {
    type: Number, // Duration watched in seconds
    default: 0
  },
  totalDuration: {
    type: Number, // Total duration in seconds
    required: true
  },
  progress: {
    type: Number, // Percentage watched (0-100)
    default: 0,
    min: 0,
    max: 100
  },
  completed: {
    type: Boolean,
    default: false
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  deviceId: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
watchHistorySchema.index({ user: 1, lastWatchedAt: -1 });
watchHistorySchema.index({ user: 1, contentId: 1, contentType: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, completed: 1 });

// Update progress percentage
watchHistorySchema.methods.updateProgress = function() {
  if (this.totalDuration > 0) {
    this.progress = Math.min(100, Math.round((this.watchedDuration / this.totalDuration) * 100));
    this.completed = this.progress >= 90; // Mark as completed if 90%+ watched
  }
};

module.exports = mongoose.model('WatchHistory', watchHistorySchema);

