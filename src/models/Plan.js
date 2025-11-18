const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  duration: {
    type: Number,
    required: true, // Duration in days
    min: 1
  },
  features: {
    maxDevices: {
      type: Number,
      default: 5
    },
    maxStreams: {
      type: Number,
      default: 3
    },
    quality: {
      type: String,
      enum: ['480p', '720p', '1080p', '4K'],
      default: '1080p'
    },
    adFree: {
      type: Boolean,
      default: false
    },
    download: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Plan', planSchema);

