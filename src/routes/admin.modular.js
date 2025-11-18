const express = require('express');
const router = express.Router();
const { safeRoute } = require('../middleware/routeWrapper');
const { authenticateAdmin, authorizeAdmin } = require('../middleware/auth');

/**
 * Modular Admin Routes - Each route is isolated with individual error handling
 * If one route fails, it doesn't affect other routes
 */

// ============================================================================
// AUTH ROUTES (Isolated)
// ============================================================================
const authRoutes = express.Router();
const adminAuthController = require('../controllers/admin/authController');

authRoutes.post('/login', safeRoute(adminAuthController.login, { routeName: 'admin.auth.login' }));
authRoutes.post('/refresh', safeRoute(adminAuthController.refreshToken, { routeName: 'admin.auth.refresh' }));
authRoutes.post('/logout', authenticateAdmin, safeRoute(adminAuthController.logout, { routeName: 'admin.auth.logout' }));

router.use('/auth', authRoutes);

// ============================================================================
// MOVIE ROUTES (Isolated)
// ============================================================================
const movieRoutes = express.Router();
const movieController = require('../controllers/admin/movieController');

movieRoutes.post('/', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(movieController.createMovie, { routeName: 'admin.movies.create' })
);

movieRoutes.get('/', 
  authenticateAdmin,
  safeRoute(movieController.getMovies, { routeName: 'admin.movies.list' })
);

movieRoutes.get('/:id', 
  authenticateAdmin,
  safeRoute(movieController.getMovieById, { routeName: 'admin.movies.getById' })
);

movieRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(movieController.updateMovie, { routeName: 'admin.movies.update' })
);

movieRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(movieController.deleteMovie, { routeName: 'admin.movies.delete' })
);

router.use('/movies', movieRoutes);

// ============================================================================
// SERIES ROUTES (Isolated)
// ============================================================================
const seriesRoutes = express.Router();
const seriesController = require('../controllers/admin/seriesController');

seriesRoutes.post('/', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.createSeries, { routeName: 'admin.series.create' })
);

seriesRoutes.get('/', 
  authenticateAdmin,
  safeRoute(seriesController.getSeries, { routeName: 'admin.series.list' })
);

seriesRoutes.get('/:id', 
  authenticateAdmin,
  safeRoute(seriesController.getSeriesById, { routeName: 'admin.series.getById' })
);

seriesRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.updateSeries, { routeName: 'admin.series.update' })
);

seriesRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.deleteSeries, { routeName: 'admin.series.delete' })
);

// Seasons
seriesRoutes.post('/:seriesId/seasons', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.createSeason, { routeName: 'admin.seasons.create' })
);

seriesRoutes.get('/:seriesId/seasons', 
  authenticateAdmin,
  safeRoute(seriesController.getSeasons, { routeName: 'admin.seasons.list' })
);

router.use('/series', seriesRoutes);

// ============================================================================
// SEASON ROUTES (Isolated)
// ============================================================================
const seasonRoutes = express.Router();

seasonRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.updateSeason, { routeName: 'admin.seasons.update' })
);

seasonRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.deleteSeason, { routeName: 'admin.seasons.delete' })
);

router.use('/seasons', seasonRoutes);

// ============================================================================
// EPISODE ROUTES (Isolated)
// ============================================================================
const episodeRoutes = express.Router();

episodeRoutes.post('/:seasonId/episodes', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.createEpisode, { routeName: 'admin.episodes.create' })
);

episodeRoutes.get('/:seasonId/episodes', 
  authenticateAdmin,
  safeRoute(seriesController.getEpisodes, { routeName: 'admin.episodes.list' })
);

episodeRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.updateEpisode, { routeName: 'admin.episodes.update' })
);

episodeRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(seriesController.deleteEpisode, { routeName: 'admin.episodes.delete' })
);

router.use('/seasons', episodeRoutes);
router.use('/episodes', episodeRoutes);

// ============================================================================
// UPLOAD ROUTES (Isolated)
// ============================================================================
const uploadRoutes = express.Router();
const uploadController = require('../controllers/admin/uploadController');

const uploadAuth = [authenticateAdmin, authorizeAdmin('super_admin', 'content_manager')];

uploadRoutes.post('/thumbnail', 
  ...uploadAuth,
  safeRoute(uploadController.getThumbnailUploadUrl, { routeName: 'admin.upload.thumbnail' })
);

uploadRoutes.post('/poster', 
  ...uploadAuth,
  safeRoute(uploadController.getPosterUploadUrl, { routeName: 'admin.upload.poster' })
);

uploadRoutes.post('/cast-image', 
  ...uploadAuth,
  safeRoute(uploadController.getCastImageUploadUrl, { routeName: 'admin.upload.castImage' })
);

uploadRoutes.post('/video', 
  ...uploadAuth,
  safeRoute(uploadController.getVideoUploadUrl, { routeName: 'admin.upload.video' })
);

uploadRoutes.post('/subtitle', 
  ...uploadAuth,
  safeRoute(uploadController.getSubtitleUploadUrl, { routeName: 'admin.upload.subtitle' })
);

uploadRoutes.post('/hls-manifest', 
  ...uploadAuth,
  safeRoute(uploadController.getHLSManifestUploadUrl, { routeName: 'admin.upload.hlsManifest' })
);

uploadRoutes.post('/hls-segment', 
  ...uploadAuth,
  safeRoute(uploadController.getHLSSegmentUploadUrl, { routeName: 'admin.upload.hlsSegment' })
);

uploadRoutes.post('/bulk', 
  ...uploadAuth,
  safeRoute(uploadController.getBulkUploadUrls, { routeName: 'admin.upload.bulk' })
);

router.use('/upload', uploadRoutes);

// ============================================================================
// ERROR LOG ROUTES (CloudWatch-like access)
// ============================================================================
const errorLogRoutes = express.Router();
const errorLogController = require('../controllers/admin/errorLogController');

errorLogRoutes.get('/', 
  authenticateAdmin,
  authorizeAdmin('super_admin', 'support'),
  safeRoute(errorLogController.getErrorLogs, { routeName: 'admin.errorLogs.list' })
);

errorLogRoutes.get('/statistics', 
  authenticateAdmin,
  authorizeAdmin('super_admin', 'support'),
  safeRoute(errorLogController.getErrorStatistics, { routeName: 'admin.errorLogs.statistics' })
);

errorLogRoutes.get('/route/:route', 
  authenticateAdmin,
  authorizeAdmin('super_admin', 'support'),
  safeRoute(errorLogController.getErrorsByRoute, { routeName: 'admin.errorLogs.getByRoute' })
);

errorLogRoutes.get('/:id', 
  authenticateAdmin,
  authorizeAdmin('super_admin', 'support'),
  safeRoute(errorLogController.getErrorById, { routeName: 'admin.errorLogs.getById' })
);

errorLogRoutes.put('/:errorId/resolve', 
  authenticateAdmin,
  authorizeAdmin('super_admin', 'support'),
  safeRoute(errorLogController.resolveError, { routeName: 'admin.errorLogs.resolve' })
);

router.use('/error-logs', errorLogRoutes);

// ============================================================================
// PLAN ROUTES (Isolated)
// ============================================================================
const planRoutes = express.Router();
const planController = require('../controllers/admin/planController');

planRoutes.post('/', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'finance'),
  safeRoute(planController.createPlan, { routeName: 'admin.plans.create' })
);

planRoutes.get('/', 
  authenticateAdmin,
  safeRoute(planController.getPlans, { routeName: 'admin.plans.list' })
);

planRoutes.get('/:id', 
  authenticateAdmin,
  safeRoute(planController.getPlanById, { routeName: 'admin.plans.getById' })
);

planRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'finance'),
  safeRoute(planController.updatePlan, { routeName: 'admin.plans.update' })
);

planRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'finance'),
  safeRoute(planController.deletePlan, { routeName: 'admin.plans.delete' })
);

router.use('/plans', planRoutes);

// ============================================================================
// USER ROUTES (Isolated)
// ============================================================================
const userRoutes = express.Router();
const userController = require('../controllers/admin/userController');

userRoutes.get('/', 
  authenticateAdmin,
  safeRoute(userController.getUsers, { routeName: 'admin.users.list' })
);

userRoutes.get('/:id', 
  authenticateAdmin,
  safeRoute(userController.getUserById, { routeName: 'admin.users.getById' })
);

userRoutes.put('/ban/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'support'),
  safeRoute(userController.banUser, { routeName: 'admin.users.ban' })
);

userRoutes.put('/unban/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'support'),
  safeRoute(userController.unbanUser, { routeName: 'admin.users.unban' })
);

router.use('/users', userRoutes);

// ============================================================================
// PAYMENT ROUTES (Isolated)
// ============================================================================
const paymentRoutes = express.Router();
const paymentController = require('../controllers/admin/paymentController');

paymentRoutes.get('/orders', 
  authenticateAdmin,
  safeRoute(paymentController.getOrders, { routeName: 'admin.payments.orders.list' })
);

paymentRoutes.get('/orders/:id', 
  authenticateAdmin,
  safeRoute(paymentController.getOrderById, { routeName: 'admin.payments.orders.getById' })
);

paymentRoutes.get('/', 
  authenticateAdmin,
  safeRoute(paymentController.getPayments, { routeName: 'admin.payments.list' })
);

router.use('/payments', paymentRoutes);
router.use('/orders', paymentRoutes);

// ============================================================================
// SECTION ROUTES (Isolated)
// ============================================================================
const sectionRoutes = express.Router();
const sectionController = require('../controllers/admin/sectionController');

sectionRoutes.post('/', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(sectionController.createSection, { routeName: 'admin.sections.create' })
);

sectionRoutes.get('/', 
  authenticateAdmin,
  safeRoute(sectionController.getSections, { routeName: 'admin.sections.list' })
);

sectionRoutes.get('/:id', 
  authenticateAdmin,
  safeRoute(sectionController.getSectionById, { routeName: 'admin.sections.getById' })
);

sectionRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(sectionController.updateSection, { routeName: 'admin.sections.update' })
);

sectionRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(sectionController.deleteSection, { routeName: 'admin.sections.delete' })
);

router.use('/sections', sectionRoutes);

// ============================================================================
// CATEGORY ROUTES (Isolated)
// ============================================================================
const categoryRoutes = express.Router();
const categoryController = require('../controllers/admin/categoryController');

categoryRoutes.post('/', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(categoryController.createCategory, { routeName: 'admin.categories.create' })
);

categoryRoutes.get('/', 
  authenticateAdmin,
  safeRoute(categoryController.getCategories, { routeName: 'admin.categories.list' })
);

categoryRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(categoryController.updateCategory, { routeName: 'admin.categories.update' })
);

categoryRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(categoryController.deleteCategory, { routeName: 'admin.categories.delete' })
);

router.use('/categories', categoryRoutes);

// ============================================================================
// AD ROUTES (Isolated)
// ============================================================================
const adRoutes = express.Router();
const adController = require('../controllers/admin/adController');

adRoutes.post('/', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(adController.createAd, { routeName: 'admin.ads.create' })
);

adRoutes.get('/', 
  authenticateAdmin,
  safeRoute(adController.getAds, { routeName: 'admin.ads.list' })
);

adRoutes.get('/:id', 
  authenticateAdmin,
  safeRoute(adController.getAdById, { routeName: 'admin.ads.getById' })
);

adRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(adController.updateAd, { routeName: 'admin.ads.update' })
);

adRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(adController.deleteAd, { routeName: 'admin.ads.delete' })
);

router.use('/ads', adRoutes);

// ============================================================================
// LANGUAGE ROUTES (Isolated)
// ============================================================================
const languageRoutes = express.Router();
const languageController = require('../controllers/admin/languageController');

languageRoutes.post('/', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(languageController.createLanguage, { routeName: 'admin.languages.create' })
);

languageRoutes.get('/', 
  authenticateAdmin,
  safeRoute(languageController.getLanguages, { routeName: 'admin.languages.list' })
);

languageRoutes.get('/:id', 
  authenticateAdmin,
  safeRoute(languageController.getLanguageById, { routeName: 'admin.languages.getById' })
);

languageRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(languageController.updateLanguage, { routeName: 'admin.languages.update' })
);

languageRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(languageController.deleteLanguage, { routeName: 'admin.languages.delete' })
);

router.use('/languages', languageRoutes);

// ============================================================================
// CAST ROUTES (Isolated)
// ============================================================================
const castRoutes = express.Router();
const castController = require('../controllers/admin/castController');

castRoutes.post('/', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(castController.createCast, { routeName: 'admin.cast.create' })
);

castRoutes.get('/', 
  authenticateAdmin,
  safeRoute(castController.getCast, { routeName: 'admin.cast.list' })
);

castRoutes.get('/:id', 
  authenticateAdmin,
  safeRoute(castController.getCastById, { routeName: 'admin.cast.getById' })
);

castRoutes.put('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(castController.updateCast, { routeName: 'admin.cast.update' })
);

castRoutes.delete('/:id', 
  authenticateAdmin, 
  authorizeAdmin('super_admin', 'content_manager'),
  safeRoute(castController.deleteCast, { routeName: 'admin.cast.delete' })
);

router.use('/cast', castRoutes);

module.exports = router;

