const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    required: true
  },
  deviceType: {
    type: String,
    enum: ['web', 'mobile', 'tv', 'tablet'],
    required: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, { timestamps: true });

const profileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String
  },
  isKids: {
    type: Boolean,
    default: false
  },
  pin: {
    type: String,
    minlength: 4,
    maxlength: 4
  }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  phone: {
    type: String,
    trim: true
  },
  profiles: [profileSchema],
  activeProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  },
  devices: [deviceSchema],
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String
  },
  lastLogin: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },
  refreshTokens: [{
    token: String,
    deviceId: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days
    }
  }],
  currentStreams: [{
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'currentStreams.contentType'
    },
    contentType: {
      type: String,
      enum: ['Movie', 'Episode']
    },
    deviceId: String,
    startedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check device limit
userSchema.methods.checkDeviceLimit = function() {
  const maxDevices = parseInt(process.env.MAX_DEVICES_PER_USER) || 5;
  return this.devices.length < maxDevices;
};

// Check concurrent stream limit
userSchema.methods.checkStreamLimit = function() {
  const maxStreams = parseInt(process.env.MAX_CONCURRENT_STREAMS) || 3;
  return this.currentStreams.length < maxStreams;
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

