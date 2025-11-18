const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema({
  series: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Series',
    required: true
  },
  seasonNumber: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String
  },
  releaseDate: {
    type: Date,
    required: true
  },
  thumbnail: {
    type: String // R2 URL
  },
  episodes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique season numbers per series
seasonSchema.index({ series: 1, seasonNumber: 1 }, { unique: true });

module.exports = mongoose.model('Season', seasonSchema);

