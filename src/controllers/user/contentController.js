const Movie = require('../../models/Movie');
const Series = require('../../models/Series');
const Season = require('../../models/Season');
const Episode = require('../../models/Episode');
const Section = require('../../models/Section');
const Category = require('../../models/Category');
const Language = require('../../models/Language');
const logger = require('../../utils/logger');
const MovieResponseTransformer = require('../../utils/movieResponseTransformer');

const getMovies = async (req, res, next) => {
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

    const movies = await Movie.find(query)
      .populate('genres')
      .populate('languageId')
      .populate('cast.castId')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-videoQualities'); // Don't expose video URLs directly

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
      .select('-videoQualities'); // Don't expose video URLs directly

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
          select: '-videoQualities' // Don't expose video URLs
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
        select: '-videoQualities'
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
      .select('-videoQualities'); // Don't expose video URLs directly

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
        select: '-videoQualities'
      })
      .sort({ sortOrder: 1 });

    // Get featured movies and series
    const featuredMovies = await Movie.find({ isActive: true, isFeatured: true })
      .populate('genres')
      .limit(10)
      .select('-videoQualities');

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

module.exports = {
  getMovies,
  getMovieById,
  getSeries,
  getSeriesById,
  getSeasons,
  getEpisodeById,
  getHomepage,
  getGenres,
  getLanguages
};

