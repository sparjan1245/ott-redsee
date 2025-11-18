const mongoose = require('mongoose');

const searchIndexSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentType'
  },
  contentType: {
    type: String,
    enum: ['Movie', 'Series', 'Episode'],
    required: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    index: true
  },
  keywords: [{
    type: String,
    index: true
  }],
  genres: [String],
  cast: [String],
  director: String,
  languageCode: String, // Renamed from 'language' to avoid MongoDB text index conflict
  releaseDate: Date,
  rating: Number,
  popularity: {
    type: Number,
    default: 0,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Text index for full-text search
searchIndexSchema.index({
  title: 'text',
  description: 'text',
  keywords: 'text',
  cast: 'text',
  director: 'text'
});

// Compound indexes
searchIndexSchema.index({ contentType: 1, isActive: 1, popularity: -1 });
searchIndexSchema.index({ genres: 1, isActive: 1 });

module.exports = mongoose.model('SearchIndex', searchIndexSchema);

