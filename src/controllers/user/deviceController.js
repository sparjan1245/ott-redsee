const User = require('../../models/User');
const logger = require('../../utils/logger');

const getDevices = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('devices');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.devices
    });
  } catch (error) {
    logger.error('Get devices error:', error);
    next(error);
  }
};

const registerDevice = async (req, res, next) => {
  try {
    const { deviceId, deviceName, deviceType } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if device already exists
    const existingDevice = user.devices.find(d => d.deviceId === deviceId);
    if (existingDevice) {
      existingDevice.lastActive = new Date();
      existingDevice.ipAddress = req.ip || req.connection.remoteAddress;
      existingDevice.userAgent = req.headers['user-agent'];
      await user.save();

      return res.json({
        success: true,
        data: existingDevice,
        message: 'Device updated'
      });
    }

    // Check device limit
    if (!user.checkDeviceLimit()) {
      return res.status(403).json({
        success: false,
        message: 'Device limit exceeded. Please remove a device first.'
      });
    }

    // Add new device
    user.devices.push({
      deviceId,
      deviceName: deviceName || 'Unknown Device',
      deviceType: deviceType || 'web',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: user.devices[user.devices.length - 1]
    });
  } catch (error) {
    logger.error('Register device error:', error);
    next(error);
  }
};

const removeDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.devices = user.devices.filter(d => d.deviceId !== deviceId);
    await user.save();

    res.json({
      success: true,
      message: 'Device removed successfully'
    });
  } catch (error) {
    logger.error('Remove device error:', error);
    next(error);
  }
};

module.exports = {
  getDevices,
  registerDevice,
  removeDevice
};

