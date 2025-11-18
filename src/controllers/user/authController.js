const User = require('../../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../../utils/jwt');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

const signup = async (req, res, next) => {
  try {
    const { email, password, phone, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create default profile
    const defaultProfile = {
      name: name || 'Profile 1',
      isKids: false
    };

    const user = new User({
      email: email.toLowerCase(),
      password,
      phone,
      profiles: [defaultProfile],
      activeProfile: null
    });

    await user.save();
    user.activeProfile = user.profiles[0]._id;
    await user.save();

    // Generate tokens
    const tokens = generateTokenPair({
      id: user._id,
      email: user.email
    });

    // Store refresh token
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          profiles: user.profiles
        },
        ...tokens
      }
    });
  } catch (error) {
    logger.error('User signup error:', error);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, deviceId, deviceName, deviceType } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive || user.isBanned) {
      return res.status(403).json({
        success: false,
        message: user.isBanned ? 'Account is banned' : 'Account is deactivated'
      });
    }

    // Check device limit
    if (deviceId && !user.devices.some(d => d.deviceId === deviceId)) {
      if (!user.checkDeviceLimit()) {
        return res.status(403).json({
          success: false,
          message: 'Device limit exceeded. Please remove a device first.'
        });
      }

      // Register new device
      user.devices.push({
        deviceId: deviceId || uuidv4(),
        deviceName: deviceName || 'Unknown Device',
        deviceType: deviceType || 'web',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    } else if (deviceId) {
      // Update existing device
      const device = user.devices.find(d => d.deviceId === deviceId);
      if (device) {
        device.lastActive = new Date();
        device.ipAddress = req.ip || req.connection.remoteAddress;
        device.userAgent = req.headers['user-agent'];
      }
    }

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip || req.connection.remoteAddress;
    await user.save();

    // Generate tokens
    const tokens = generateTokenPair({
      id: user._id,
      email: user.email
    });

    // Store refresh token
    user.refreshTokens.push({ token: tokens.refreshToken, deviceId });
    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          profiles: user.profiles,
          activeProfile: user.activeProfile
        },
        ...tokens
      }
    });
  } catch (error) {
    logger.error('User login error:', error);
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive || user.isBanned) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists
    const tokenExists = user.refreshTokens.some(
      t => t.token === refreshToken
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      id: user._id,
      email: user.email
    });

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(
      t => t.token !== refreshToken
    );
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('User refresh token error:', error);
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user.id);

    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(
        t => t.token !== refreshToken
      );
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('User logout error:', error);
    next(error);
  }
};

const createProfile = async (req, res, next) => {
  try {
    const { name, isKids, pin } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.profiles.push({ name, isKids: isKids || false, pin });
    await user.save();

    res.status(201).json({
      success: true,
      data: user.profiles[user.profiles.length - 1]
    });
  } catch (error) {
    logger.error('Create profile error:', error);
    next(error);
  }
};

const getProfiles = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('profiles activeProfile');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        profiles: user.profiles,
        activeProfile: user.activeProfile
      }
    });
  } catch (error) {
    logger.error('Get profiles error:', error);
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const profile = user.profiles.id(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    Object.assign(profile, req.body);
    await user.save();

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

const deleteProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.profiles.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last profile'
      });
    }

    user.profiles = user.profiles.filter(p => p._id.toString() !== id);
    if (user.activeProfile?.toString() === id) {
      user.activeProfile = user.profiles[0]._id;
    }
    await user.save();

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    logger.error('Delete profile error:', error);
    next(error);
  }
};

const switchProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const profile = user.profiles.id(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    user.activeProfile = profile._id;
    await user.save();

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Switch profile error:', error);
    next(error);
  }
};

module.exports = {
  signup,
  login,
  refreshToken,
  logout,
  createProfile,
  getProfiles,
  updateProfile,
  deleteProfile,
  switchProfile
};

