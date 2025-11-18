const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  genres: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  releaseDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  ageRating: {
    type: String,
    enum: ['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A'],
    default: 'PG-13'
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language'
  },
  thumbnail: {
    type: String, // R2 URL
    required: true
  },
  poster: {
    type: String, // R2 URL
    required: true
  },
  trailer: {
    type: String // YouTube/Vimeo URL
  },
  seasons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season'
  }],
  cast: [{
    castId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cast',
      required: true
    },
    role: {
      type: String,
      required: true
    }
  }],
  director: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
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

// Indexes for search and filtering
seriesSchema.index({ title: 'text', description: 'text' });
seriesSchema.index({ releaseDate: -1 });
seriesSchema.index({ rating: -1 });
seriesSchema.index({ isActive: 1, isFeatured: 1 });
seriesSchema.index({ languageId: 1 });
seriesSchema.index({ 'cast.castId': 1 });

module.exports = mongoose.model('Series', seriesSchema);

