const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middleware/auth');
const userAuthController = require('../controllers/user/authController');
const contentController = require('../controllers/user/contentController');
const streamingController = require('../controllers/user/streamingController');
const subscriptionController = require('../controllers/user/subscriptionController');
const watchlistController = require('../controllers/user/watchlistController');
const watchHistoryController = require('../controllers/user/watchHistoryController');
const searchController = require('../controllers/user/searchController');
const deviceController = require('../controllers/user/deviceController');

// User Auth Routes
router.post('/auth/signup', userAuthController.signup);
router.post('/auth/login', userAuthController.login);
router.post('/auth/refresh', userAuthController.refreshToken);
router.post('/auth/logout', authenticateUser, userAuthController.logout);

// Profile Routes
router.post('/profiles', authenticateUser, userAuthController.createProfile);
router.get('/profiles', authenticateUser, userAuthController.getProfiles);
router.put('/profiles/:id', authenticateUser, userAuthController.updateProfile);
router.delete('/profiles/:id', authenticateUser, userAuthController.deleteProfile);
router.put('/profiles/:id/switch', authenticateUser, userAuthController.switchProfile);

// Content Routes
router.get('/movies', contentController.getMovies);
router.get('/movies/:id', contentController.getMovieById);
router.get('/series', contentController.getSeries);
router.get('/series/:id', contentController.getSeriesById);
router.get('/series/:id/seasons', contentController.getSeasons);
router.get('/episodes/:id', contentController.getEpisodeById);
router.get('/homepage', contentController.getHomepage);

// Streaming Routes
router.get('/stream/movie/:id', authenticateUser, streamingController.getMovieStream);
router.get('/stream/episode/:id', authenticateUser, streamingController.getEpisodeStream);
router.get('/stream/subtitle/:id', authenticateUser, streamingController.getSubtitle);

// Watch History Routes
router.get('/watch-history', authenticateUser, watchHistoryController.getWatchHistory);
router.post('/watch-history', authenticateUser, watchHistoryController.updateWatchHistory);
router.delete('/watch-history/:id', authenticateUser, watchHistoryController.deleteWatchHistory);
router.get('/watch-history/continue-watching', authenticateUser, watchHistoryController.getContinueWatching);

// Watchlist Routes
router.get('/watchlist', authenticateUser, watchlistController.getWatchlist);
router.post('/watchlist', authenticateUser, watchlistController.addToWatchlist);
router.delete('/watchlist/:id', authenticateUser, watchlistController.removeFromWatchlist);

// Subscription Routes
router.get('/subscription', authenticateUser, subscriptionController.getSubscription);
router.post('/subscription/subscribe', authenticateUser, subscriptionController.subscribe);
router.post('/subscription/cancel', authenticateUser, subscriptionController.cancelSubscription);

// Payment Routes
router.post('/payment/create-order', authenticateUser, subscriptionController.createPaymentOrder);
router.post('/payment/verify', authenticateUser, subscriptionController.verifyPayment);

// Search Routes
router.get('/search', searchController.search);

// Public Content Routes
router.get('/genres', contentController.getGenres);
router.get('/languages', contentController.getLanguages);

// Device Routes
router.get('/devices', authenticateUser, deviceController.getDevices);
router.post('/devices/register', authenticateUser, deviceController.registerDevice);
router.delete('/devices/:deviceId', authenticateUser, deviceController.removeDevice);

module.exports = router;

