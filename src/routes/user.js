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

router.post('/auth/signup', userAuthController.signup);
router.post('/auth/login', userAuthController.login);
router.post('/auth/refresh', userAuthController.refreshToken);
router.post('/auth/logout', authenticateUser, userAuthController.logout);

router.post('/profiles', authenticateUser, userAuthController.createProfile);
router.get('/profiles', authenticateUser, userAuthController.getProfiles);
router.put('/profiles/:id', authenticateUser, userAuthController.updateProfile);
router.delete('/profiles/:id', authenticateUser, userAuthController.deleteProfile);
router.put('/profiles/:id/switch', authenticateUser, userAuthController.switchProfile);


router.get('/homepage', contentController.getHomepage);
router.get('/trending', contentController.getTrending);
router.get('/popular', contentController.getPopular);
router.get('/recently-added', contentController.getRecentlyAdded);
router.get('/upcoming', contentController.getUpcoming);
router.get('/kids', contentController.getKidsContent);

router.get('/movies', contentController.getMovies);
router.get('/series', contentController.getSeries);
router.get('/genres', contentController.getGenres);
router.get('/languages', contentController.getLanguages);

// Content Details
router.get('/movies/:id', contentController.getMovieById);
router.get('/series/:id', contentController.getSeriesById);
router.get('/series/:id/seasons', contentController.getSeasons);
router.get('/episodes/:id', contentController.getEpisodeById);
router.get('/cast/:id', contentController.getCastDetails);

// Content Discovery
router.get('/content/related', contentController.getRelatedContent);
router.get('/content/by-cast', contentController.getContentByCast);
router.get('/content/by-language', contentController.getContentByLanguage);

// Search
router.get('/search', searchController.search);

// ==================== AUTHENTICATED CONTENT ROUTES ====================
// Recommendations (Personalized)
router.get('/recommendations', authenticateUser, contentController.getRecommendations);

// ==================== STREAMING ROUTES ====================
router.get('/stream/qualities', authenticateUser, streamingController.getAvailableQualities);
router.get('/stream/movie/:id', authenticateUser, streamingController.getMovieStream);
router.get('/stream/episode/:id', authenticateUser, streamingController.getEpisodeStream);
router.get('/stream/subtitle/:id', authenticateUser, streamingController.getSubtitle);
router.get('/stream/playback-position', authenticateUser, streamingController.getPlaybackPosition);
router.post('/stream/playback-position', authenticateUser, streamingController.updatePlaybackPosition);

// ==================== WATCH HISTORY ROUTES ====================
router.get('/watch-history', authenticateUser, watchHistoryController.getWatchHistory);
router.post('/watch-history', authenticateUser, watchHistoryController.updateWatchHistory);
router.delete('/watch-history/:id', authenticateUser, watchHistoryController.deleteWatchHistory);
router.get('/watch-history/continue-watching', authenticateUser, watchHistoryController.getContinueWatching);

// ==================== WATCHLIST ROUTES ====================
router.get('/watchlist', authenticateUser, watchlistController.getWatchlist);
router.post('/watchlist', authenticateUser, watchlistController.addToWatchlist);
router.delete('/watchlist/:id', authenticateUser, watchlistController.removeFromWatchlist);

// ==================== SUBSCRIPTION ROUTES ====================
router.get('/subscription', authenticateUser, subscriptionController.getSubscription);
router.post('/subscription/subscribe', authenticateUser, subscriptionController.subscribe);
router.post('/subscription/cancel', authenticateUser, subscriptionController.cancelSubscription);

// ==================== PAYMENT ROUTES ====================
router.post('/payment/create-order', authenticateUser, subscriptionController.createPaymentOrder);
router.post('/payment/verify', authenticateUser, subscriptionController.verifyPayment);

// ==================== DEVICE ROUTES ====================
router.get('/devices', authenticateUser, deviceController.getDevices);
router.post('/devices/register', authenticateUser, deviceController.registerDevice);
router.delete('/devices/:deviceId', authenticateUser, deviceController.removeDevice);

module.exports = router;

