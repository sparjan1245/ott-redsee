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

// Admin Auth Routes
router.post('/auth/login', adminAuthController.login);
router.post('/auth/refresh', adminAuthController.refreshToken);
router.post('/auth/logout', authenticateAdmin, adminAuthController.logout);

// Movies Routes
router.post('/movies', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), movieController.createMovie);
router.get('/movies', authenticateAdmin, movieController.getMovies);
router.get('/movies/:id', authenticateAdmin, movieController.getMovieById);
router.put('/movies/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), movieController.updateMovie);
router.delete('/movies/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), movieController.deleteMovie);

// Series Routes
router.post('/series', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.createSeries);
router.get('/series', authenticateAdmin, seriesController.getSeries);
router.get('/series/:id', authenticateAdmin, seriesController.getSeriesById);
router.put('/series/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), seriesController.updateSeries);
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
router.delete('/sections/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), sectionController.deleteSection);

// Categories Routes
router.post('/categories', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), categoryController.createCategory);
router.get('/categories', authenticateAdmin, categoryController.getCategories);
router.put('/categories/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), categoryController.updateCategory);
router.delete('/categories/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), categoryController.deleteCategory);

// Ads Routes
router.post('/ads', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), adController.createAd);
router.get('/ads', authenticateAdmin, adController.getAds);
router.get('/ads/:id', authenticateAdmin, adController.getAdById);
router.put('/ads/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), adController.updateAd);
router.delete('/ads/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), adController.deleteAd);

// Languages Routes
router.post('/languages', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), languageController.createLanguage);
router.get('/languages', authenticateAdmin, languageController.getLanguages);
router.get('/languages/:id', authenticateAdmin, languageController.getLanguageById);
router.put('/languages/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), languageController.updateLanguage);
router.delete('/languages/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), languageController.deleteLanguage);

// Cast Routes
router.post('/cast', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), castController.createCast);
router.get('/cast', authenticateAdmin, castController.getCast);
router.get('/cast/:id', authenticateAdmin, castController.getCastById);
router.put('/cast/:id', authenticateAdmin, authorizeAdmin('super_admin', 'content_manager'), castController.updateCast);
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

module.exports = router;

