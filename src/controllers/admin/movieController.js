const Movie = require('../../models/Movie');
const SearchIndex = require('../../models/SearchIndex');
const logger = require('../../utils/logger');
const { getSignedUploadUrl, getVideoPath } = require('../../config/r2');
const MovieResponseTransformer = require('../../utils/movieResponseTransformer');

/**
 * @swagger
 * /admin/movies:
 *   post:
 *     summary: Create a new movie
 *     tags: [Admin Movies]
 *     security:
 *       - bearerAuth: []
 */
const createMovie = async (req, res, next) => {
  try {
    const movieData = { ...req.body };
    
    // Map 'language' to 'languageId' for backward compatibility
    // MongoDB text indexes reserve 'language' field, so we use 'languageId' internally
    if (movieData.language && !movieData.languageId) {
      movieData.languageId = movieData.language;
    }
    // CRITICAL: Remove 'language' field completely to avoid MongoDB text index conflict
    delete movieData.language;
    
    const movie = new Movie(movieData);
    await movie.save();
    // Update search index
    await SearchIndex.findOneAndUpdate(
      { contentId: movie._id, contentType: 'Movie' },
      {
        contentId: movie._id,
        contentType: 'Movie',
        title: movie.title,
        description: movie.description,
        genres: movie.genres,
        cast: movie.cast?.map(c => c.name) || [],
        director: movie.director,
        languageCode: movie.languageId ? movie.languageId.toString() : null, // Store as string to avoid conflict
        releaseDate: movie.releaseDate,
        rating: movie.rating,
        isActive: movie.isActive
      },
      { upsert: true, new: true }
    );

    // Populate before returning
    await movie.populate(['genres', 'languageId', 'cast.castId']);

    res.status(201).json({
      success: true,
      data: MovieResponseTransformer.transformSingle(movie)
    });
  } catch (error) {
    logger.error('Create movie error:', error);
    next(error);
  }
};

/**
 * @swagger
 * /admin/movies:
 *   get:
 *     summary: Get all movies
 *     tags: [Admin Movies]
 *     security:
 *       - bearerAuth: []
 */
const getMovies = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const query = {};

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // Active filter
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Fetch paginated movies
    const movies = await Movie.find(query)
      .populate('genres')
      .populate('languageId')
      .populate('cast.castId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Total count
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
    logger.error("Get movies error:", error);
    next(error);
  }
};

const getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id)
      .populate('genres')
      .populate('languageId')
      .populate('cast.castId');

    if (!movie) {
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

const updateMovie = async (req, res, next) => {
  try {
    const updateData = req.body;
    
    // Map 'language' to 'languageId' for backward compatibility
    if (updateData.language && !updateData.languageId) {
      updateData.languageId = updateData.language;
      delete updateData.language; // Remove to avoid confusion
    }
    
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('genres')
      .populate('languageId')
      .populate('cast.castId');

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Update search index
    await SearchIndex.findOneAndUpdate(
      { contentId: movie._id, contentType: 'Movie' },
      {
        title: movie.title,
        description: movie.description,
        genres: movie.genres,
        cast: movie.cast?.map(c => c.name) || [],
        director: movie.director,
        languageCode: movie.languageId ? movie.languageId.toString() : null, // Store as string to avoid conflict
        releaseDate: movie.releaseDate,
        rating: movie.rating,
        isActive: movie.isActive
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: MovieResponseTransformer.transformSingle(movie)
    });
  } catch (error) {
    logger.error('Update movie error:', error);
    next(error);
  }
};

const deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Remove from search index
    await SearchIndex.deleteOne({ contentId: movie._id, contentType: 'Movie' });

    res.json({
      success: true,
      message: 'Movie deleted successfully'
    });
  } catch (error) {
    logger.error('Delete movie error:', error);
    next(error);
  }
};

/**
 * Get signed URL for video upload
 */
const getVideoUploadUrl = async (req, res, next) => {
  try {
    const { movieId } = req.body;
    const key = getVideoPath('movie', movieId);
    const url = await getSignedUploadUrl(key, 'video/mp4', 3600);

    res.json({
      success: true,
      data: { url, key }
    });
  } catch (error) {
    logger.error('Get video upload URL error:', error);
    next(error);
  }
};

const toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value (true or false)'
      });
    }

    const movie = await Movie.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    )
      .populate('genres')
      .populate('languageId')
      .populate('cast.castId');

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Update search index
    await SearchIndex.findOneAndUpdate(
      { contentId: movie._id, contentType: 'Movie' },
      { isActive: movie.isActive },
      { upsert: true }
    );

    res.json({
      success: true,
      message: `Movie ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: MovieResponseTransformer.transformSingle(movie)
    });
  } catch (error) {
    logger.error('Toggle movie active status error:', error);
    next(error);
  }
};

module.exports = {
  createMovie,
  getMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  getVideoUploadUrl,
  toggleActive
};

