const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY
  });
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - Token payload
 * @returns {Object} Token pair
 */
const generateTokenPair = (payload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Access token verification failed:', error.message);
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    logger.error('Refresh token verification failed:', error.message);
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Generate streaming token (for secure video URLs)
 * @param {Object} payload - Token payload (userId, contentId, etc.)
 * @param {string} expiresIn - Expiration time (default: 1h)
 * @returns {string} Streaming token
 */
const generateStreamingToken = (payload, expiresIn = process.env.STREAMING_TOKEN_EXPIRY || '1h') => {
  const secret = process.env.STREAMING_TOKEN_SECRET || JWT_SECRET;
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn
  });
};

/**
 * Verify streaming token
 * @param {string} token - Streaming token
 * @returns {Object} Decoded token
 */
const verifyStreamingToken = (token) => {
  try {
    const secret = process.env.STREAMING_TOKEN_SECRET || JWT_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    logger.error('Streaming token verification failed:', error.message);
    throw new Error('Invalid or expired streaming token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  generateStreamingToken,
  verifyStreamingToken
};

