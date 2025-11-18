const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
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
    enum: ['Movie', 'Series'],
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique content per user
watchlistSchema.index({ user: 1, contentId: 1, contentType: 1 }, { unique: true });
watchlistSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Watchlist', watchlistSchema);

