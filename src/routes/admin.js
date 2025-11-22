const express = require('express');
const router = express.Router();

const { authenticateAdmin, authorizeAdmin } = require('../middleware/auth');
const adminAuthController = require('../controllers/admin/authController');
const movieController = require('../controllers/admin/movieController');
const seriesController = require('../controllers/admin/seriesController');
const planController = require('../controllers/admin/planController');
const userController = require('../controllers/admin/userController');
const paymentController = require('../controllers/admin/paymentController');
const sectionController = require('../controllers/admin/sectionController');
const categoryController = require('../controllers/admin/categoryController');
const adController = require('../controllers/admin/adController');
const languageController = require('../controllers/admin/languageController');
const castController = require('../controllers/admin/castController');
const uploadController = require('../controllers/admin/uploadController');
const analyticsController = require('../controllers/admin/analyticsController');
const errorLogController = require('../controllers/admin/errorLogController');

// Admin Auth Routes
router.post('/auth/login', adminAuthController.login);
router.post('/auth/refresh', adminAuthController.refreshToken);
router.post('/auth/logout', authenticateAdmin, adminAuthController.logout);

// Movies Routes
router.post('/movies', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), movieController.createMovie);
router.get('/movies', authenticateAdmin, movieController.getMovies);
router.get('/movies/:id', authenticateAdmin, movieController.getMovieById);
router.put('/movies/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), movieController.updateMovie);
router.patch('/movies/:id/status', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), movieController.toggleActive);
router.delete('/movies/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), movieController.deleteMovie);

// Series Routes
router.post('/series', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.createSeries);
router.get('/series', authenticateAdmin, seriesController.getSeries);
router.get('/series/:id', authenticateAdmin, seriesController.getSeriesById);
router.put('/series/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.updateSeries);
router.patch('/series/:id/status', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.toggleActive);
router.delete('/series/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.deleteSeries);

// Seasons Routes
router.post('/series/:seriesId/seasons', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.createSeason);
router.get('/series/:seriesId/seasons', authenticateAdmin, seriesController.getSeasons);
router.put('/seasons/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.updateSeason);
router.delete('/seasons/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.deleteSeason);

// Episodes Routes
router.post('/seasons/:seasonId/episodes', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.createEpisode);
router.get('/seasons/:seasonId/episodes', authenticateAdmin, seriesController.getEpisodes);
router.put('/episodes/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.updateEpisode);
router.delete('/episodes/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.deleteEpisode);

// Plans Routes
router.post('/plans', authenticateAdmin, authorizeAdmin('super_admin', 'finance'), planController.createPlan);
router.get('/plans', authenticateAdmin, planController.getPlans);
router.get('/plans/:id', authenticateAdmin, planController.getPlanById);
router.put('/plans/:id', authenticateAdmin, authorizeAdmin('super_admin', 'finance'), planController.updatePlan);
router.patch('/plans/:id/status', authenticateAdmin, authorizeAdmin('super_admin', 'finance'), planController.toggleActive);
router.delete('/plans/:id', authenticateAdmin, authorizeAdmin('super_admin', 'finance'), planController.deletePlan);

// Users Routes
router.get('/users', authenticateAdmin, userController.getUsers);
router.get('/users/:id', authenticateAdmin, userController.getUserById);
router.put('/users/ban/:id', authenticateAdmin, authorizeAdmin('super_admin', 'support'), userController.banUser);
router.put('/users/unban/:id', authenticateAdmin, authorizeAdmin('super_admin', 'support'), userController.unbanUser);

// Orders/Payments Routes
router.get('/orders', authenticateAdmin, paymentController.getOrders);
router.get('/orders/:id', authenticateAdmin, paymentController.getOrderById);
router.get('/payments', authenticateAdmin, paymentController.getPayments);

// Sections Routes
router.post('/sections', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), sectionController.createSection);
router.get('/sections', authenticateAdmin, sectionController.getSections);
router.get('/sections/:id', authenticateAdmin, sectionController.getSectionById);
router.put('/sections/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), sectionController.updateSection);
router.patch('/sections/:id/status', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), sectionController.toggleActive);
router.delete('/sections/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), sectionController.deleteSection);

// Categories Routes
router.post('/categories', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), categoryController.createCategory);
router.get('/categories', authenticateAdmin, categoryController.getAllCategories);
router.get('/categories/:id', authenticateAdmin, categoryController.getCategoryById);
router.put('/categories/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), categoryController.updateCategory);
router.patch('/categories/:id/status', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), categoryController.toggleActive);
router.delete('/categories/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), categoryController.deleteCategory);

// Ads Routes
router.post('/ads', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), adController.createAd);
router.get('/ads', authenticateAdmin, adController.getAds);
router.get('/ads/:id', authenticateAdmin, adController.getAdById);
router.put('/ads/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), adController.updateAd);
router.patch('/ads/:id/status', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), adController.toggleActive);
router.delete('/ads/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), adController.deleteAd);

// Languages Routes
router.post('/languages', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), languageController.createLanguage);
router.get('/languages', authenticateAdmin, languageController.getLanguages);
router.get('/languages/:id', authenticateAdmin, languageController.getLanguageById);
router.put('/languages/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), languageController.updateLanguage);
router.patch('/languages/:id/status', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), languageController.toggleActive);
router.delete('/languages/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), languageController.deleteLanguage);

// Cast Routes
router.post('/cast', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), castController.createCast);
router.get('/cast', authenticateAdmin, castController.getCast);
router.get('/cast/:id', authenticateAdmin, castController.getCastById);
router.put('/cast/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), castController.updateCast);
router.patch('/cast/:id/status', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), castController.toggleActive);
router.delete('/cast/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), castController.deleteCast);

// Upload Routes (Cloudflare R2)
router.post('/upload/thumbnail', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), uploadController.getThumbnailUploadUrl);
router.post('/upload/poster', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), uploadController.getPosterUploadUrl);
router.post('/upload/cast-image', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), uploadController.getCastImageUploadUrl);
router.post('/upload/video', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), uploadController.getVideoUploadUrl);
router.post('/upload/subtitle', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), uploadController.getSubtitleUploadUrl);
router.post('/upload/hls-manifest', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), uploadController.getHLSManifestUploadUrl);
router.post('/upload/hls-segment', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), uploadController.getHLSSegmentUploadUrl);
router.post('/upload/bulk', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), uploadController.getBulkUploadUrls);

// Dashboard Analytics Routes
router.get('/dashboard/summary', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getSummary);
router.get('/dashboard/revenue', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getRevenue);
router.get('/dashboard/subscriptions', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getSubscriptions);
router.get('/dashboard/most-viewed', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getMostViewed);
router.get('/dashboard/least-viewed', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getLeastViewed);
router.get('/dashboard/categories', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getCategories);
router.get('/dashboard/genres', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getGenres);
router.get('/dashboard/watch-history', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getWatchHistory);
router.get('/dashboard/ads', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getAds);
router.get('/dashboard/active-devices', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), analyticsController.getActiveDevices);

// Error Logs Routes
router.get('/error-logs', authenticateAdmin, authorizeAdmin('super_admin'), errorLogController.getErrorLogs);
router.get('/error-logs/statistics', authenticateAdmin, authorizeAdmin('super_admin'), errorLogController.getErrorStatistics);
router.get('/error-logs/:id', authenticateAdmin, authorizeAdmin('super_admin'), errorLogController.getErrorById);
router.post('/error-logs/:errorId/resolve', authenticateAdmin, authorizeAdmin('super_admin'), errorLogController.resolveError);
router.get('/error-logs/route/:route', authenticateAdmin, authorizeAdmin('super_admin'), errorLogController.getErrorsByRoute);

module.exports = router;

