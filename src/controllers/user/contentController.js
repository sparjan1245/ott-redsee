const Movie = require('../../models/Movie');
const Series = require('../../models/Series');
const Season = require('../../models/Season');
const Episode = require('../../models/Episode');
const Section = require('../../models/Section');
const Category = require('../../models/Category');
const Language = require('../../models/Language');
const WatchHistory = require('../../models/WatchHistory');
const Watchlist = require('../../models/Watchlist');
const Cast = require('../../models/Cast');
const logger = require('../../utils/logger');
const MovieResponseTransformer = require('../../utils/movieResponseTransformer');

const getMovies = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      genre, 
      search, 
      sortBy, 
      language,
      year,
      ageRating,
      rating,
      isKids
    } = req.query;
    const query = { isActive: true };

    if (genre) {
      query.genres = Array.isArray(genre) ? { $in: genre } : genre;
    }

    if (language) {
      query.languageId = language;
    }

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query.releaseDate = { $gte: startDate, $lte: endDate };
    }

    if (ageRating) {
      query.ageRating = ageRating;
    }

    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    if (isKids === 'true') {
      query.ageRating = { $in: ['G', 'PG', 'U'] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sort = {};
    if (sortBy === 'rating') sort = { rating: -1 };
    else if (sortBy === 'releaseDate') sort = { releaseDate: -1 };
    else if (sortBy === 'views') sort = { views: -1 };
    else if (sortBy === 'popularity') sort = { watchCount: -1 };
    else sort = { createdAt: -1 };

    const movies = await Movie.find(query)
      .populate('genres')
      .populate('languageId')
      .populate('cast.castId')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-video');

    const total = await Movie.countDocuments(query);

    res.json({
      success: true,
      data: MovieResponseTransformer.transform(movies),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get movies error:', error);
    next(error);
  }
};

const getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id)
      .populate('genres')
      .populate('languageId')
      .populate('cast.castId')
      .select('-video'); // Don't expose video URLs directly

    if (!movie || !movie.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    res.json({
      success: true,
      data: MovieResponseTransformer.transformSingle(movie)
    });
  } catch (error) {
    logger.error('Get movie by ID error:', error);
    next(error);
  }
};

const getSeries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, genre, search, sortBy } = req.query;
    const query = { isActive: true };

    if (genre) {
      query.genres = genre;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sort = {};
    if (sortBy === 'rating') sort = { rating: -1 };
    else if (sortBy === 'releaseDate') sort = { releaseDate: -1 };
    else sort = { createdAt: -1 };

    const series = await Series.find(query)
      .populate('genres')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Series.countDocuments(query);

    res.json({
      success: true,
      data: series,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get series error:', error);
    next(error);
  }
};

const getSeriesById = async (req, res, next) => {
  try {
    const series = await Series.findById(req.params.id)
      .populate('genres')
      .populate({
        path: 'seasons',
        populate: {
          path: 'episodes',
          select: '-video' // Don't expose video URLs
        }
      });

    if (!series || !series.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    res.json({
      success: true,
      data: series
    });
  } catch (error) {
    logger.error('Get series by ID error:', error);
    next(error);
  }
};

const getSeasons = async (req, res, next) => {
  try {
    const seasons = await Season.find({ series: req.params.id, isActive: true })
      .populate({
        path: 'episodes',
        select: '-video'
      })
      .sort({ seasonNumber: 1 });

    res.json({
      success: true,
      data: seasons
    });
  } catch (error) {
    logger.error('Get seasons error:', error);
    next(error);
  }
};

const getEpisodeById = async (req, res, next) => {
  try {
    const episode = await Episode.findById(req.params.id)
      .populate('series')
      .populate('season')
      .select('-video'); // Don't expose video URLs directly

    if (!episode || !episode.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    res.json({
      success: true,
      data: episode
    });
  } catch (error) {
    logger.error('Get episode by ID error:', error);
    next(error);
  }
};

const getHomepage = async (req, res, next) => {
  try {
    const sections = await Section.find({ isActive: true })
      .populate({
        path: 'items.contentId',
        select: '-video'
      })
      .sort({ sortOrder: 1 });

    // Get featured movies and series
    const featuredMovies = await Movie.find({ isActive: true, isFeatured: true })
      .populate('genres')
      .limit(10)
      .select('-video');

    const featuredSeries = await Series.find({ isActive: true, isFeatured: true })
      .populate('genres')
      .limit(10);

    res.json({
      success: true,
      data: {
        sections,
        featured: {
          movies: featuredMovies,
          series: featuredSeries
        }
      }
    });
  } catch (error) {
    logger.error('Get homepage error:', error);
    next(error);
  }
};

const getGenres = async (req, res, next) => {
  try {
    const genres = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: genres
    });
  } catch (error) {
    logger.error('Get genres error:', error);
    next(error);
  }
};

const getLanguages = async (req, res, next) => {
  try {
    const languages = await Language.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    logger.error('Get languages error:', error);
    next(error);
  }
};

const getTrending = async (req, res, next) => {
  try {
    const { type = 'both', limit = 20 } = req.query;
    const daysAgo = 7;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    const trendingMovies = [];
    const trendingSeries = [];

    if (type === 'both' || type === 'movie') {
      const movieWatchCounts = await WatchHistory.aggregate([
        {
          $match: {
            contentType: 'Movie',
            lastWatchedAt: { $gte: dateThreshold }
          }
        },
        {
          $group: {
            _id: '$contentId',
            watchCount: { $sum: 1 }
          }
        },
        { $sort: { watchCount: -1 } },
        { $limit: parseInt(limit) }
      ]);

      const movieIds = movieWatchCounts.map(m => m._id);
      const movies = await Movie.find({
        _id: { $in: movieIds },
        isActive: true
      })
        .populate('genres')
        .populate('languageId')
        .select('-video');

      trendingMovies.push(...movies);
    }

    if (type === 'both' || type === 'series') {
      const seriesWatchCounts = await WatchHistory.aggregate([
        {
          $match: {
            contentType: 'Episode',
            lastWatchedAt: { $gte: dateThreshold }
          }
        },
        {
          $group: {
            _id: '$series',
            watchCount: { $sum: 1 }
          }
        },
        { $sort: { watchCount: -1 } },
        { $limit: parseInt(limit) }
      ]);

      const seriesIds = seriesWatchCounts.map(s => s._id).filter(Boolean);
      const series = await Series.find({
        _id: { $in: seriesIds },
        isActive: true
      })
        .populate('genres')
        .populate('languageId');

      trendingSeries.push(...series);
    }

    res.json({
      success: true,
      data: {
        movies: trendingMovies,
        series: trendingSeries
      }
    });
  } catch (error) {
    logger.error('Get trending error:', error);
    next(error);
  }
};

const getPopular = async (req, res, next) => {
  try {
    const { type = 'both', limit = 20 } = req.query;

    const popularMovies = [];
    const popularSeries = [];

    if (type === 'both' || type === 'movie') {
      const movies = await Movie.find({ isActive: true })
        .populate('genres')
        .populate('languageId')
        .sort({ watchCount: -1, views: -1 })
        .limit(parseInt(limit))
        .select('-video');

      popularMovies.push(...movies);
    }

    if (type === 'both' || type === 'series') {
      const series = await Series.find({ isActive: true })
        .populate('genres')
        .populate('languageId')
        .sort({ watchCount: -1, views: -1 })
        .limit(parseInt(limit));

      popularSeries.push(...series);
    }

    res.json({
      success: true,
      data: {
        movies: popularMovies,
        series: popularSeries
      }
    });
  } catch (error) {
    logger.error('Get popular error:', error);
    next(error);
  }
};

const getRecentlyAdded = async (req, res, next) => {
  try {
    const { type = 'both', limit = 20 } = req.query;
    const daysAgo = 30;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    const recentMovies = [];
    const recentSeries = [];

    if (type === 'both' || type === 'movie') {
      const movies = await Movie.find({
        isActive: true,
        createdAt: { $gte: dateThreshold }
      })
        .populate('genres')
        .populate('languageId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('-video');

      recentMovies.push(...movies);
    }

    if (type === 'both' || type === 'series') {
      const series = await Series.find({
        isActive: true,
        createdAt: { $gte: dateThreshold }
      })
        .populate('genres')
        .populate('languageId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      recentSeries.push(...series);
    }

    res.json({
      success: true,
      data: {
        movies: recentMovies,
        series: recentSeries
      }
    });
  } catch (error) {
    logger.error('Get recently added error:', error);
    next(error);
  }
};

const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { limit = 20 } = req.query;

    if (!userId) {
      return res.json({
        success: true,
        data: {
          movies: [],
          series: []
        }
      });
    }

    const userWatchHistory = await WatchHistory.find({ user: userId })
      .populate('contentId')
      .limit(50);

    const watchedGenres = new Set();
    const watchedCastIds = new Set();

    userWatchHistory.forEach(history => {
      if (history.contentId) {
        if (history.contentType === 'Movie' && history.contentId.genres) {
          history.contentId.genres.forEach(genre => {
            if (genre && genre._id) watchedGenres.add(genre._id.toString());
          });
        }
        if (history.contentId.cast) {
          history.contentId.cast.forEach(castItem => {
            if (castItem.castId && castItem.castId._id) {
              watchedCastIds.add(castItem.castId._id.toString());
            }
          });
        }
      }
    });

    const genreArray = Array.from(watchedGenres);
    const castArray = Array.from(watchedCastIds);
    const watchedContentIds = userWatchHistory.map(h => h.contentId?._id).filter(Boolean);

    const recommendations = [];

    if (genreArray.length > 0) {
      const recommendedMovies = await Movie.find({
        isActive: true,
        genres: { $in: genreArray },
        _id: { $nin: watchedContentIds }
      })
        .populate('genres')
        .populate('languageId')
        .sort({ rating: -1, watchCount: -1 })
        .limit(parseInt(limit))
        .select('-video');

      recommendations.push(...recommendedMovies);
    }

    if (castArray.length > 0) {
      const castMovies = await Movie.find({
        isActive: true,
        'cast.castId': { $in: castArray },
        _id: { $nin: watchedContentIds }
      })
        .populate('genres')
        .populate('languageId')
        .sort({ rating: -1 })
        .limit(parseInt(limit))
        .select('-video');

      recommendations.push(...castMovies);
    }

    const uniqueRecommendations = recommendations.filter((movie, index, self) =>
      index === self.findIndex(m => m._id.toString() === movie._id.toString())
    ).slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        movies: uniqueRecommendations,
        series: []
      }
    });
  } catch (error) {
    logger.error('Get recommendations error:', error);
    next(error);
  }
};

const getRelatedContent = async (req, res, next) => {
  try {
    const { id, type = 'movie', limit = 10 } = req.query;

    if (type === 'movie') {
      const movie = await Movie.findById(id).populate('genres');
      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      const genreIds = movie.genres.map(g => g._id);
      const related = await Movie.find({
        _id: { $ne: id },
        isActive: true,
        genres: { $in: genreIds }
      })
        .populate('genres')
        .populate('languageId')
        .limit(parseInt(limit))
        .select('-video');

      res.json({
        success: true,
        data: related
      });
    } else {
      const series = await Series.findById(id).populate('genres');
      if (!series) {
        return res.status(404).json({
          success: false,
          message: 'Series not found'
        });
      }

      const genreIds = series.genres.map(g => g._id);
      const related = await Series.find({
        _id: { $ne: id },
        isActive: true,
        genres: { $in: genreIds }
      })
        .populate('genres')
        .populate('languageId')
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: related
      });
    }
  } catch (error) {
    logger.error('Get related content error:', error);
    next(error);
  }
};

const getContentByCast = async (req, res, next) => {
  try {
    const { castId, type = 'both', limit = 20 } = req.query;

    const movies = [];
    const series = [];

    if (type === 'both' || type === 'movie') {
      const movieList = await Movie.find({
        isActive: true,
        'cast.castId': castId
      })
        .populate('genres')
        .populate('languageId')
        .populate('cast.castId')
        .limit(parseInt(limit))
        .select('-video');

      movies.push(...movieList);
    }

    if (type === 'both' || type === 'series') {
      const seriesList = await Series.find({
        isActive: true,
        'cast.castId': castId
      })
        .populate('genres')
        .populate('languageId')
        .populate('cast.castId')
        .limit(parseInt(limit));

      series.push(...seriesList);
    }

    res.json({
      success: true,
      data: {
        movies,
        series
      }
    });
  } catch (error) {
    logger.error('Get content by cast error:', error);
    next(error);
  }
};

const getContentByLanguage = async (req, res, next) => {
  try {
    const { languageId, type = 'both', limit = 20 } = req.query;

    const movies = [];
    const series = [];

    if (type === 'both' || type === 'movie') {
      const movieList = await Movie.find({
        isActive: true,
        languageId: languageId
      })
        .populate('genres')
        .populate('languageId')
        .limit(parseInt(limit))
        .select('-video');

      movies.push(...movieList);
    }

    if (type === 'both' || type === 'series') {
      const seriesList = await Series.find({
        isActive: true,
        languageId: languageId
      })
        .populate('genres')
        .populate('languageId')
        .limit(parseInt(limit));

      series.push(...seriesList);
    }

    res.json({
      success: true,
      data: {
        movies,
        series
      }
    });
  } catch (error) {
    logger.error('Get content by language error:', error);
    next(error);
  }
};

const getKidsContent = async (req, res, next) => {
  try {
    const { type = 'both', limit = 20 } = req.query;

    const kidsMovies = [];
    const kidsSeries = [];

    if (type === 'both' || type === 'movie') {
      const movies = await Movie.find({
        isActive: true,
        ageRating: { $in: ['G', 'PG', 'U'] }
      })
        .populate('genres')
        .populate('languageId')
        .sort({ rating: -1 })
        .limit(parseInt(limit))
        .select('-video');

      kidsMovies.push(...movies);
    }

    if (type === 'both' || type === 'series') {
      const series = await Series.find({
        isActive: true,
        ageRating: { $in: ['G', 'PG', 'U'] }
      })
        .populate('genres')
        .populate('languageId')
        .sort({ rating: -1 })
        .limit(parseInt(limit));

      kidsSeries.push(...series);
    }

    res.json({
      success: true,
      data: {
        movies: kidsMovies,
        series: kidsSeries
      }
    });
  } catch (error) {
    logger.error('Get kids content error:', error);
    next(error);
  }
};

const getUpcoming = async (req, res, next) => {
  try {
    const { type = 'both', limit = 20 } = req.query;
    const today = new Date();

    const upcomingMovies = [];
    const upcomingSeries = [];

    if (type === 'both' || type === 'movie') {
      const movies = await Movie.find({
        isActive: true,
        releaseDate: { $gt: today }
      })
        .populate('genres')
        .populate('languageId')
        .sort({ releaseDate: 1 })
        .limit(parseInt(limit))
        .select('-video');

      upcomingMovies.push(...movies);
    }

    if (type === 'both' || type === 'series') {
      const series = await Series.find({
        isActive: true,
        releaseDate: { $gt: today }
      })
        .populate('genres')
        .populate('languageId')
        .sort({ releaseDate: 1 })
        .limit(parseInt(limit));

      upcomingSeries.push(...series);
    }

    res.json({
      success: true,
      data: {
        movies: upcomingMovies,
        series: upcomingSeries
      }
    });
  } catch (error) {
    logger.error('Get upcoming error:', error);
    next(error);
  }
};

const getCastDetails = async (req, res, next) => {
  try {
    const cast = await Cast.findById(req.params.id);
    if (!cast || !cast.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Cast not found'
      });
    }

    const movies = await Movie.find({
      isActive: true,
      'cast.castId': cast._id
    })
      .populate('genres')
      .select('-video')
      .limit(20);

    const series = await Series.find({
      isActive: true,
      'cast.castId': cast._id
    })
      .populate('genres')
      .limit(20);

    res.json({
      success: true,
      data: {
        cast,
        content: {
          movies,
          series
        }
      }
    });
  } catch (error) {
    logger.error('Get cast details error:', error);
    next(error);
  }
};

module.exports = {
  getMovies,
  getMovieById,
  getSeries,
  getSeriesById,
  getSeasons,
  getEpisodeById,
  getHomepage,
  getGenres,
  getLanguages,
  getTrending,
  getPopular,
  getRecentlyAdded,
  getRecommendations,
  getRelatedContent,
  getContentByCast,
  getContentByLanguage,
  getKidsContent,
  getUpcoming,
  getCastDetails
};

