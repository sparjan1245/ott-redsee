const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  series: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Series',
    required: true
  },
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  episodeNumber: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  duration: {
    type: Number, // Duration in minutes
    required: true
  },
  releaseDate: {
    type: Date,
    required: true
  },
  thumbnail: {
    type: String, // R2 URL
    required: true
  },
  video: {
    type: String, // R2 URL - Single video file
    required: true
  },
  subtitles: [{
    language: String,
    url: String // R2 URL
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  watchCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure unique episode numbers per season
episodeSchema.index({ season: 1, episodeNumber: 1 }, { unique: true });
episodeSchema.index({ series: 1 });

module.exports = mongoose.model('Episode', episodeSchema);

