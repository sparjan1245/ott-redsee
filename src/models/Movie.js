const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
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
  duration: {
    type: Number, // Duration in minutes
    required: true
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
  videoQualities: {
    '240p': { type: String }, // R2 path
    '360p': { type: String },
    '480p': { type: String },
    '720p': { type: String },
    '1080p': { type: String },
    '4K': { type: String }
  },
  subtitles: [{
    language: String,
    url: String // R2 URL
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to map languageId to language for backward compatibility
movieSchema.virtual('language').get(function() {
  return this.languageId;
});

// Indexes for search and filtering
movieSchema.index({ title: 'text', description: 'text' });
movieSchema.index({ releaseDate: -1 });
movieSchema.index({ rating: -1 });
movieSchema.index({ isActive: 1, isFeatured: 1 });
movieSchema.index({ languageId: 1 });
movieSchema.index({ 'cast.castId': 1 });

module.exports = mongoose.model('Movie', movieSchema);
