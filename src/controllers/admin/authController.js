const Admin = require('../../models/Admin');
const { generateTokenPair, verifyRefreshToken } = require('../../utils/jwt');
const logger = require('../../utils/logger');

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin || !await admin.comparePassword(password)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    admin.lastLoginIP = req.ip || req.connection.remoteAddress;
    await admin.save();

    // Generate tokens
    const tokens = generateTokenPair({
      id: admin._id,
      email: admin.email,
      role: admin.role
    });

    // Store refresh token
    admin.refreshTokens.push({ token: tokens.refreshToken });
    await admin.save();

    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        },
        ...tokens
      }
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    next(error);
  }
};

/**
 * @swagger
 * /admin/auth/refresh:
 *   post:
 *     summary: Refresh admin access token
 *     tags: [Admin Auth]
 */
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
    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in admin's tokens
    const tokenExists = admin.refreshTokens.some(
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
      id: admin._id,
      email: admin.email,
      role: admin.role
    });

    // Remove old refresh token and add new one
    admin.refreshTokens = admin.refreshTokens.filter(
      t => t.token !== refreshToken
    );
    admin.refreshTokens.push({ token: tokens.refreshToken });
    await admin.save();

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('Admin refresh token error:', error);
    next(error);
  }
};

/**
 * @swagger
 * /admin/auth/logout:
 *   post:
 *     summary: Admin logout
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (admin && refreshToken) {
      admin.refreshTokens = admin.refreshTokens.filter(
        t => t.token !== refreshToken
      );
      await admin.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Admin logout error:', error);
    next(error);
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};

