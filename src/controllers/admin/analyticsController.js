const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const Payment = require('../../models/Payment');
const Plan = require('../../models/Plan');
const Movie = require('../../models/Movie');
const Series = require('../../models/Series');
const Episode = require('../../models/Episode');
const WatchHistory = require('../../models/WatchHistory');
const Watchlist = require('../../models/Watchlist');
const Ad = require('../../models/Ad');
const Category = require('../../models/Category');
const logger = require('../../utils/logger');

/**
 * Helper function to build date filter
 */
const buildDateFilter = (from, to) => {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      filter.createdAt.$gte = new Date(from);
    }
    if (to) {
      filter.createdAt.$lte = new Date(to);
    }
  }
  return filter;
};

/**
 * Helper function to build content type filter
 */
const buildContentTypeFilter = (contentType) => {
  if (!contentType) return {};
  return { contentType };
};

/**
 * GET /admin/dashboard/summary
 * Get summary metrics for dashboard
 */
const getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = buildDateFilter(from, to);

    // Total users
    const totalUsers = await User.countDocuments(dateFilter);

    // Active subscriptions
    const activeSubscriptions = await Subscription.countDocuments({
      status: 'active',
      endDate: { $gte: new Date() },
      ...dateFilter
    });

    // Total revenue (from completed payments)
    const revenueResult = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Active devices (users with devices)
    const activeDevicesResult = await User.aggregate([
      {
        $match: dateFilter
      },
      {
        $project: {
          deviceCount: { $size: { $ifNull: ['$devices', []] } }
        }
      },
      {
        $group: {
          _id: null,
          totalDevices: { $sum: '$deviceCount' }
        }
      }
    ]);
    const activeDevices = activeDevicesResult[0]?.totalDevices || 0;

    // Total movies and series
    const totalMovies = await Movie.countDocuments({ isActive: true });
    const totalSeries = await Series.countDocuments({ isActive: true });

    // Total watchlist items
    const totalWatchlistItems = await Watchlist.countDocuments(dateFilter);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeSubscriptions,
        totalRevenue,
        activeDevices,
        totalMovies,
        totalSeries,
        totalWatchlistItems
      }
    });
  } catch (error) {
    logger.error('Get summary analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/revenue
 * Get revenue analytics with trends
 */
const getRevenue = async (req, res, next) => {
  try {
    const { from, to, period = 'daily', planId } = req.query;
    const matchFilter = {
      status: 'completed',
      ...buildDateFilter(from, to)
    };

    if (planId) {
      const mongoose = require('mongoose');
      matchFilter.plan = new mongoose.Types.ObjectId(planId);
    }

    // Determine date grouping format
    let dateFormat;
    switch (period) {
      case 'yearly':
        dateFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
        break;
      case 'monthly':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'weekly':
        dateFormat = {
          $concat: [
            { $toString: { $year: '$createdAt' } },
            '-W',
            {
              $toString: {
                $cond: [
                  { $lt: [{ $week: '$createdAt' }, 10] },
                  { $concat: ['0', { $toString: { $week: '$createdAt' } }] },
                  { $toString: { $week: '$createdAt' } }
                ]
              }
            }
          ]
        };
        break;
      default: // daily
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    // Revenue trends
    const revenueTrends = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: dateFormat,
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          revenue: 1,
          count: 1
        }
      }
    ]);

    // Payment success/failure counts
    const paymentStats = await Payment.aggregate([
      { $match: buildDateFilter(from, to) },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Revenue per plan
    const revenuePerPlan = await Payment.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'plans',
          localField: 'plan',
          foreignField: '_id',
          as: 'planData'
        }
      },
      { $unwind: '$planData' },
      {
        $group: {
          _id: '$plan',
          planName: { $first: '$planData.name' },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          _id: 0,
          planId: '$_id',
          planName: 1,
          revenue: 1,
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        trends: revenueTrends,
        paymentStats: paymentStats.map(stat => ({
          status: stat._id,
          count: stat.count
        })),
        revenuePerPlan
      }
    });
  } catch (error) {
    logger.error('Get revenue analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/subscriptions
 * Get subscription analytics
 */
const getSubscriptions = async (req, res, next) => {
  try {
    const { from, to, planId } = req.query;
    const dateFilter = buildDateFilter(from, to);
    const matchFilter = { ...dateFilter };

    if (planId) {
      const mongoose = require('mongoose');
      matchFilter.plan = new mongoose.Types.ObjectId(planId);
    }

    // Active vs expired subscriptions
    const subscriptionStatus = await Subscription.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Subscriptions per plan
    const subscriptionsPerPlan = await Subscription.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'plans',
          localField: 'plan',
          foreignField: '_id',
          as: 'planData'
        }
      },
      { $unwind: '$planData' },
      {
        $group: {
          _id: '$plan',
          planName: { $first: '$planData.name' },
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'active'] }, { $gt: ['$endDate', new Date()] }] },
                1,
                0
              ]
            }
          },
          expired: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$status', 'expired'] }, { $lte: ['$endDate', new Date()] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          planId: '$_id',
          planName: 1,
          total: '$count',
          active: 1,
          expired: 1
        }
      }
    ]);

    // New subscriptions over time (daily)
    const newSubscriptionsTrend = await Subscription.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        statusBreakdown: subscriptionStatus.map(stat => ({
          status: stat._id,
          count: stat.count
        })),
        subscriptionsPerPlan,
        newSubscriptionsTrend
      }
    });
  } catch (error) {
    logger.error('Get subscriptions analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/most-viewed
 * Get most viewed content
 */
const getMostViewed = async (req, res, next) => {
  try {
    const { from, to, contentType, categoryId, limit = 10 } = req.query;
    const dateFilter = buildDateFilter(from, to);
    const contentTypeFilter = buildContentTypeFilter(contentType);

    const matchFilter = {
      ...dateFilter,
      ...contentTypeFilter
    };

    // Build aggregation pipeline for movies
    const moviePipeline = [
      {
        $match: {
          contentType: 'Movie',
          ...matchFilter
        }
      },
      {
        $group: {
          _id: '$contentId',
          views: { $sum: 1 },
          totalWatchTime: { $sum: '$watchedDuration' },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' }
    ];

    // Add category filter if provided
    if (categoryId) {
      const mongoose = require('mongoose');
      moviePipeline.push({
        $match: { 'movie.genres': new mongoose.Types.ObjectId(categoryId) }
      });
    }

    // Complete the pipeline
    moviePipeline.push(
      {
        $project: {
          _id: 0,
          contentId: '$_id',
          title: '$movie.title',
          views: 1,
          uniqueViewers: { $size: '$uniqueUsers' },
          totalWatchTime: 1,
          thumbnail: '$movie.thumbnail'
        }
      },
      { $sort: { views: -1 } },
      { $limit: parseInt(limit) }
    );

    // Most viewed movies
    const mostViewedMovies = await WatchHistory.aggregate(moviePipeline);

    // Most viewed episodes
    const mostViewedEpisodes = await WatchHistory.aggregate([
      {
        $match: {
          contentType: 'Episode',
          ...matchFilter
        }
      },
      {
        $group: {
          _id: '$contentId',
          views: { $sum: 1 },
          totalWatchTime: { $sum: '$watchedDuration' },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $lookup: {
          from: 'episodes',
          localField: '_id',
          foreignField: '_id',
          as: 'episode'
        }
      },
      { $unwind: '$episode' },
      {
        $lookup: {
          from: 'series',
          localField: 'episode.series',
          foreignField: '_id',
          as: 'series'
        }
      },
      { $unwind: '$series' },
      {
        $project: {
          _id: 0,
          contentId: '$_id',
          title: '$episode.title',
          seriesTitle: '$series.title',
          episodeNumber: '$episode.episodeNumber',
          views: 1,
          uniqueViewers: { $size: '$uniqueUsers' },
          totalWatchTime: 1,
          thumbnail: '$episode.thumbnail'
        }
      },
      { $sort: { views: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: {
        movies: mostViewedMovies,
        episodes: mostViewedEpisodes
      }
    });
  } catch (error) {
    logger.error('Get most viewed analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/least-viewed
 * Get least viewed content
 */
const getLeastViewed = async (req, res, next) => {
  try {
    const { from, to, contentType, categoryId, limit = 10 } = req.query;
    const dateFilter = buildDateFilter(from, to);
    const contentTypeFilter = buildContentTypeFilter(contentType);

    // Get all content and their view counts
    let contentQuery = {};
    if (contentType === 'Movie') {
      contentQuery = { isActive: true };
    if (categoryId) {
      const mongoose = require('mongoose');
      contentQuery.genres = new mongoose.Types.ObjectId(categoryId);
    }
    }

    if (contentType === 'Movie') {
      const leastViewed = await Movie.aggregate([
        { $match: contentQuery },
        {
          $lookup: {
            from: 'watchhistories',
            let: { movieId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$contentId', '$$movieId'] },
                      { $eq: ['$contentType', 'Movie'] },
                      ...(dateFilter.createdAt ? [
                        { $gte: ['$createdAt', dateFilter.createdAt.$gte] },
                        { $lte: ['$createdAt', dateFilter.createdAt.$lte] }
                      ] : [])
                    ]
                  }
                }
              }
            ],
            as: 'watchHistory'
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            thumbnail: 1,
            views: { $size: '$watchHistory' },
            watchCount: 1
          }
        },
        { $sort: { views: 1, watchCount: 1 } },
        { $limit: parseInt(limit) }
      ]);

      res.json({
        success: true,
        data: {
          movies: leastViewed
        }
      });
    } else {
      // For episodes
      const leastViewed = await Episode.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'watchhistories',
            let: { episodeId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$contentId', '$$episodeId'] },
                      { $eq: ['$contentType', 'Episode'] },
                      ...(dateFilter.createdAt ? [
                        { $gte: ['$createdAt', dateFilter.createdAt.$gte] },
                        { $lte: ['$createdAt', dateFilter.createdAt.$lte] }
                      ] : [])
                    ]
                  }
                }
              }
            ],
            as: 'watchHistory'
          }
        },
        {
          $lookup: {
            from: 'series',
            localField: 'series',
            foreignField: '_id',
            as: 'seriesData'
          }
        },
        { $unwind: '$seriesData' },
        {
          $project: {
            _id: 1,
            title: 1,
            thumbnail: 1,
            seriesTitle: '$seriesData.title',
            episodeNumber: 1,
            views: { $size: '$watchHistory' },
            watchCount: 1
          }
        },
        { $sort: { views: 1, watchCount: 1 } },
        { $limit: parseInt(limit) }
      ]);

      res.json({
        success: true,
        data: {
          episodes: leastViewed
        }
      });
    }
  } catch (error) {
    logger.error('Get least viewed analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/categories
 * Get category-wise analytics
 */
const getCategories = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = buildDateFilter(from, to);

    // Category-wise total views
    const categoryViews = await WatchHistory.aggregate([
      {
        $match: {
          contentType: 'Movie',
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'movies',
          localField: 'contentId',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' },
      { $unwind: '$movie.genres' },
      {
        $lookup: {
          from: 'categories',
          localField: 'movie.genres',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$movie.genres',
          categoryName: { $first: '$category.name' },
          views: { $sum: 1 },
          uniqueViewers: { $addToSet: '$user' },
          totalWatchTime: { $sum: '$watchedDuration' }
        }
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: 1,
          views: 1,
          uniqueViewers: { $size: '$uniqueViewers' },
          totalWatchTime: 1
        }
      },
      { $sort: { views: -1 } }
    ]);

    // Trending categories (recent views)
    const recentDateFilter = {
      lastWatchedAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    };

    const trendingCategories = await WatchHistory.aggregate([
      {
        $match: {
          contentType: 'Movie',
          ...recentDateFilter
        }
      },
      {
        $lookup: {
          from: 'movies',
          localField: 'contentId',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' },
      { $unwind: '$movie.genres' },
      {
        $lookup: {
          from: 'categories',
          localField: 'movie.genres',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$movie.genres',
          categoryName: { $first: '$category.name' },
          views: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: 1,
          views: 1
        }
      },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        categoryViews,
        trendingCategories
      }
    });
  } catch (error) {
    logger.error('Get categories analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/genres
 * Get genre-wise analytics (same as categories in this system)
 */
const getGenres = async (req, res, next) => {
  try {
    // In this system, genres are stored as categories
    // So we'll use the same logic as categories
    const { from, to } = req.query;
    const dateFilter = buildDateFilter(from, to);

    // Genre-wise total views (same as categories)
    const genreViews = await WatchHistory.aggregate([
      {
        $match: {
          contentType: 'Movie',
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'movies',
          localField: 'contentId',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' },
      { $unwind: '$movie.genres' },
      {
        $lookup: {
          from: 'categories',
          localField: 'movie.genres',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$movie.genres',
          genreName: { $first: '$category.name' },
          views: { $sum: 1 },
          uniqueViewers: { $addToSet: '$user' },
          totalWatchTime: { $sum: '$watchedDuration' }
        }
      },
      {
        $project: {
          _id: 0,
          genreId: '$_id',
          genreName: 1,
          views: 1,
          uniqueViewers: { $size: '$uniqueViewers' },
          totalWatchTime: 1
        }
      },
      { $sort: { views: -1 } }
    ]);

    // Trending genres (recent views)
    const recentDateFilter = {
      lastWatchedAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    };

    const trendingGenres = await WatchHistory.aggregate([
      {
        $match: {
          contentType: 'Movie',
          ...recentDateFilter
        }
      },
      {
        $lookup: {
          from: 'movies',
          localField: 'contentId',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' },
      { $unwind: '$movie.genres' },
      {
        $lookup: {
          from: 'categories',
          localField: 'movie.genres',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$movie.genres',
          genreName: { $first: '$category.name' },
          views: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          genreId: '$_id',
          genreName: 1,
          views: 1
        }
      },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        genreViews,
        trendingGenres
      }
    });
  } catch (error) {
    logger.error('Get genres analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/watch-history
 * Get watch history analytics
 */
const getWatchHistory = async (req, res, next) => {
  try {
    const { from, to, contentType, profileType } = req.query;
    const dateFilter = buildDateFilter(from, to);
    const contentTypeFilter = buildContentTypeFilter(contentType);

    const matchFilter = {
      ...dateFilter,
      ...contentTypeFilter
    };

    // Top watched episodes/movies
    const topWatched = await WatchHistory.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            contentId: '$contentId',
            contentType: '$contentType'
          },
          views: { $sum: 1 },
          totalWatchTime: { $sum: '$watchedDuration' },
          completedViews: {
            $sum: {
              $cond: [{ $eq: ['$completed', true] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'movies',
          localField: '_id.contentId',
          foreignField: '_id',
          as: 'movie'
        }
      },
      {
        $lookup: {
          from: 'episodes',
          localField: '_id.contentId',
          foreignField: '_id',
          as: 'episode'
        }
      },
      {
        $project: {
          _id: 0,
          contentId: '$_id.contentId',
          contentType: '$_id.contentType',
          title: {
            $cond: [
              { $eq: ['$_id.contentType', 'Movie'] },
              { $arrayElemAt: ['$movie.title', 0] },
              { $arrayElemAt: ['$episode.title', 0] }
            ]
          },
          views: 1,
          totalWatchTime: 1,
          completedViews: 1
        }
      },
      { $sort: { views: -1 } },
      { $limit: 20 }
    ]);

    // Continue watching trends (content watched but not completed)
    const continueWatching = await WatchHistory.aggregate([
      {
        $match: {
          ...matchFilter,
          completed: false,
          progress: { $gt: 0, $lt: 90 }
        }
      },
      {
        $group: {
          _id: {
            contentId: '$contentId',
            contentType: '$contentType'
          },
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Views per profile type (adult/kids)
    const viewsByProfile = await WatchHistory.aggregate([
      {
        $match: {
          ...matchFilter,
          profile: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: '$userData' },
      { $unwind: '$userData.profiles' },
      {
        $match: {
          $expr: {
            $eq: ['$profile', '$userData.profiles._id']
          }
        }
      },
      {
        $group: {
          _id: '$userData.profiles.isKids',
          views: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          _id: 0,
          profileType: {
            $cond: [{ $eq: ['$_id', true] }, 'kids', 'adult']
          },
          views: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        topWatched,
        continueWatching,
        viewsByProfile: viewsByProfile.length > 0 ? viewsByProfile : [
          { profileType: 'adult', views: 0, uniqueUsers: 0 },
          { profileType: 'kids', views: 0, uniqueUsers: 0 }
        ]
      }
    });
  } catch (error) {
    logger.error('Get watch history analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/ads
 * Get ads analytics
 */
const getAds = async (req, res, next) => {
  try {
    const { from, to, adId } = req.query;
    const dateFilter = buildDateFilter(from, to);

    const matchFilter = { ...dateFilter };
    if (adId) {
      const mongoose = require('mongoose');
      matchFilter._id = new mongoose.Types.ObjectId(adId);
    }

    // Ad impressions & clicks
    const adsStats = await Ad.aggregate([
      { $match: matchFilter },
      {
        $project: {
          _id: 1,
          title: 1,
          type: 1,
          impressions: 1,
          clicks: 1,
          ctr: {
            $cond: [
              { $gt: ['$impressions', 0] },
              { $multiply: [{ $divide: ['$clicks', '$impressions'] }, 100] },
              0
            ]
          },
          isActive: 1,
          startDate: 1,
          endDate: 1
        }
      },
      { $sort: { impressions: -1 } }
    ]);

    // Top performing ads
    const topPerformingAds = await Ad.aggregate([
      { $match: matchFilter },
      {
        $project: {
          _id: 1,
          title: 1,
          type: 1,
          impressions: 1,
          clicks: 1,
          ctr: {
            $cond: [
              { $gt: ['$impressions', 0] },
              { $multiply: [{ $divide: ['$clicks', '$impressions'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { ctr: -1 } },
      { $limit: 10 }
    ]);

    // Revenue per ad (if metadata contains revenue info)
    // Note: This assumes revenue is tracked in ad metadata or separate model
    // Adjust based on your actual implementation
    const revenuePerAd = adsStats.map(ad => ({
      adId: ad._id,
      title: ad.title,
      impressions: ad.impressions,
      clicks: ad.clicks,
      estimatedRevenue: 0 // Placeholder - implement based on your revenue tracking
    }));

    res.json({
      success: true,
      data: {
        adsStats,
        topPerformingAds,
        revenuePerAd,
        totalImpressions: adsStats.reduce((sum, ad) => sum + ad.impressions, 0),
        totalClicks: adsStats.reduce((sum, ad) => sum + ad.clicks, 0),
        averageCTR: adsStats.length > 0
          ? adsStats.reduce((sum, ad) => sum + ad.ctr, 0) / adsStats.length
          : 0
      }
    });
  } catch (error) {
    logger.error('Get ads analytics error:', error);
    next(error);
  }
};

/**
 * GET /admin/dashboard/active-devices
 * Get device and usage analytics
 */
const getActiveDevices = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = buildDateFilter(from, to);

    // Active devices per user
    const devicesPerUser = await User.aggregate([
      { $match: dateFilter },
      {
        $project: {
          _id: 1,
          email: 1,
          deviceCount: { $size: { $ifNull: ['$devices', []] } },
          devices: 1
        }
      },
      {
        $match: {
          deviceCount: { $gt: 0 }
        }
      },
      { $sort: { deviceCount: -1 } },
      { $limit: 50 }
    ]);

    // Concurrent streams (currentStreams)
    const concurrentStreams = await User.aggregate([
      {
        $project: {
          _id: 1,
          email: 1,
          activeStreams: { $size: { $ifNull: ['$currentStreams', []] } }
        }
      },
      {
        $match: {
          activeStreams: { $gt: 0 }
        }
      },
      { $sort: { activeStreams: -1 } }
    ]);

    // Device type breakdown
    const deviceTypeBreakdown = await User.aggregate([
      { $match: dateFilter },
      { $unwind: { path: '$devices', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$devices.deviceType',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$devices.deviceId' }
        }
      },
      {
        $project: {
          _id: 0,
          deviceType: '$_id',
          count: 1,
          uniqueDevices: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Total active devices
    const totalActiveDevices = await User.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalDevices: { $sum: { $size: { $ifNull: ['$devices', []] } } },
          usersWithDevices: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$devices', []] } }, 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        devicesPerUser: devicesPerUser.map(user => ({
          userId: user._id,
          email: user.email,
          deviceCount: user.deviceCount,
          devices: user.devices.map(d => ({
            deviceId: d.deviceId,
            deviceName: d.deviceName,
            deviceType: d.deviceType,
            lastActive: d.lastActive
          }))
        })),
        concurrentStreams: concurrentStreams.map(user => ({
          userId: user._id,
          email: user.email,
          activeStreams: user.activeStreams
        })),
        deviceTypeBreakdown,
        summary: {
          totalActiveDevices: totalActiveDevices[0]?.totalDevices || 0,
          usersWithDevices: totalActiveDevices[0]?.usersWithDevices || 0,
          totalConcurrentStreams: concurrentStreams.reduce((sum, u) => sum + u.activeStreams, 0)
        }
      }
    });
  } catch (error) {
    logger.error('Get active devices analytics error:', error);
    next(error);
  }
};

module.exports = {
  getSummary,
  getRevenue,
  getSubscriptions,
  getMostViewed,
  getLeastViewed,
  getCategories,
  getGenres,
  getWatchHistory,
  getAds,
  getActiveDevices
};

