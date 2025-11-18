const mongoose = require('mongoose');

const castSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String, // R2 URL
    required: true
  },
  bio: {
    type: String
  },
  dateOfBirth: {
    type: Date
  },
  nationality: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search
castSchema.index({ name: 'text', role: 'text' });

module.exports = mongoose.model('Cast', castSchema);

