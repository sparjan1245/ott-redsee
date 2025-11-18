const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Series = require('../models/Series');
const Season = require('../models/Season');
const Episode = require('../models/Episode');
const SearchIndex = require('../models/SearchIndex');
const logger = require('../utils/logger');

/**
 * Content Service - Shared operations for Movies, Series, Episodes
 * Handles CRUD operations, search index updates, and transactions
 */
class ContentService {
  /**
   * Create movie with transaction and search index update
   * @param {Object} movieData - Movie data
   * @param {Object} session - MongoDB session (optional)
   * @returns {Promise<Object>} Created movie
   */
  static async createMovie(movieData, session = null) {
    try {
      const movie = new Movie(movieData);
      await movie.save({ session });

      // Update search index
      await this.updateSearchIndex('Movie', movie._id, movie, session);

      return movie;
    } catch (error) {
      logger.error('ContentService.createMovie error:', error);
      throw error;
    }
  }

  /**
   * Update movie with transaction and search index update
   * @param {string} movieId - Movie ID
   * @param {Object} updateData - Update data
   * @param {Object} session - MongoDB session (optional)
   * @returns {Promise<Object>} Updated movie
   */
  static async updateMovie(movieId, updateData, session = null) {
    try {
      const movie = await Movie.findByIdAndUpdate(
        movieId,
        updateData,
        { new: true, runValidators: true, session }
      ).populate('genres');

      if (!movie) {
        throw new Error('Movie not found');
      }

      // Update search index
      await this.updateSearchIndex('Movie', movie._id, movie, session);

      return movie;
    } catch (error) {
      logger.error('ContentService.updateMovie error:', error);
      throw error;
    }
  }

  /**
   * Delete movie with transaction and cleanup
   * @param {string} movieId - Movie ID
   * @param {Object} session - MongoDB session (optional)
   * @returns {Promise<void>}
   */
  static async deleteMovie(movieId, session = null) {
    try {
      const movie = await Movie.findByIdAndDelete(movieId, { session });

      if (!movie) {
        throw new Error('Movie not found');
      }

      // Remove from search index
      await SearchIndex.deleteOne(
        { contentId: movie._id, contentType: 'Movie' },
        { session }
      );
    } catch (error) {
      logger.error('ContentService.deleteMovie error:', error);
      throw error;
    }
  }

  /**
   * Create series with transaction and search index update
   * @param {Object} seriesData - Series data
   * @param {Object} session - MongoDB session (optional)
   * @returns {Promise<Object>} Created series
   */
  static async createSeries(seriesData, session = null) {
    try {
      const series = new Series(seriesData);
      await series.save({ session });

      // Update search index
      await this.updateSearchIndex('Series', series._id, series, session);

      return series;
    } catch (error) {
      logger.error('ContentService.createSeries error:', error);
      throw error;
    }
  }

  /**
   * Update series with transaction and search index update
   * @param {string} seriesId - Series ID
   * @param {Object} updateData - Update data
   * @param {Object} session - MongoDB session (optional)
   * @returns {Promise<Object>} Updated series
   */
  static async updateSeries(seriesId, updateData, session = null) {
    try {
      const series = await Series.findByIdAndUpdate(
        seriesId,
        updateData,
        { new: true, runValidators: true, session }
      ).populate('genres');

      if (!series) {
        throw new Error('Series not found');
      }

      // Update search index
      await this.updateSearchIndex('Series', series._id, series, session);

      return series;
    } catch (error) {
      logger.error('ContentService.updateSeries error:', error);
      throw error;
    }
  }

  /**
   * Delete series with all seasons and episodes (transaction-safe)
   * @param {string} seriesId - Series ID
   * @returns {Promise<void>}
   */
  static async deleteSeries(seriesId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const series = await Series.findById(seriesId).session(session);

      if (!series) {
        throw new Error('Series not found');
      }

      // Delete all seasons
      await Season.deleteMany({ series: seriesId }).session(session);

      // Delete all episodes
      await Episode.deleteMany({ series: seriesId }).session(session);

      // Delete series
      await Series.findByIdAndDelete(seriesId).session(session);

      // Remove from search index
      await SearchIndex.deleteOne(
        { contentId: series._id, contentType: 'Series' },
        { session }
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      logger.error('ContentService.deleteSeries error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create season with transaction
   * @param {string} seriesId - Series ID
   * @param {Object} seasonData - Season data
   * @param {Object} session - MongoDB session (optional)
   * @returns {Promise<Object>} Created season
   */
  static async createSeason(seriesId, seasonData, session = null) {
    try {
      // Verify series exists
      const series = await Series.findById(seriesId).session(session);
      if (!series) {
        throw new Error('Series not found');
      }

      const season = new Season({ ...seasonData, series: seriesId });
      await season.save({ session });

      // Add season to series
      await Series.findByIdAndUpdate(
        seriesId,
        { $push: { seasons: season._id } },
        { session }
      );

      return season;
    } catch (error) {
      logger.error('ContentService.createSeason error:', error);
      throw error;
    }
  }

  /**
   * Delete season with all episodes (transaction-safe)
   * @param {string} seasonId - Season ID
   * @returns {Promise<void>}
   */
  static async deleteSeason(seasonId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const season = await Season.findById(seasonId).session(session);

      if (!season) {
        throw new Error('Season not found');
      }

      // Delete all episodes
      await Episode.deleteMany({ season: seasonId }).session(session);

      // Delete season
      await Season.findByIdAndDelete(seasonId).session(session);

      // Remove season from series
      await Series.findByIdAndUpdate(
        season.series,
        { $pull: { seasons: seasonId } },
        { session }
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      logger.error('ContentService.deleteSeason error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create episode with transaction
   * @param {string} seasonId - Season ID
   * @param {Object} episodeData - Episode data
   * @param {Object} session - MongoDB session (optional)
   * @returns {Promise<Object>} Created episode
   */
  static async createEpisode(seasonId, episodeData, session = null) {
    try {
      // Verify season exists and get series reference
      const season = await Season.findById(seasonId).session(session);
      if (!season) {
        throw new Error('Season not found');
      }

      const episode = new Episode({
        ...episodeData,
        series: season.series,
        season: seasonId
      });
      await episode.save({ session });

      // Add episode to season
      await Season.findByIdAndUpdate(
        seasonId,
        { $push: { episodes: episode._id } },
        { session }
      );

      return episode;
    } catch (error) {
      logger.error('ContentService.createEpisode error:', error);
      throw error;
    }
  }

  /**
   * Delete episode with transaction
   * @param {string} episodeId - Episode ID
   * @returns {Promise<void>}
   */
  static async deleteEpisode(episodeId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const episode = await Episode.findById(episodeId).session(session);

      if (!episode) {
        throw new Error('Episode not found');
      }

      // Delete episode
      await Episode.findByIdAndDelete(episodeId).session(session);

      // Remove episode from season
      await Season.findByIdAndUpdate(
        episode.season,
        { $pull: { episodes: episodeId } },
        { session }
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      logger.error('ContentService.deleteEpisode error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update search index for content
   * @param {string} contentType - 'Movie' or 'Series'
   * @param {Object} contentId - Content ID
   * @param {Object} content - Content document
   * @param {Object} session - MongoDB session (optional)
   * @returns {Promise<void>}
   */
  static async updateSearchIndex(contentType, contentId, content, session = null) {
    try {
      // Extract cast names if cast array exists
      const castNames = content.cast?.map(c => {
        if (typeof c === 'object' && c.name) {
          return c.name;
        }
        return c;
      }) || [];

      // Extract genre IDs
      const genreIds = content.genres?.map(g => {
        if (typeof g === 'object' && g._id) {
          return g._id.toString();
        }
        return g.toString();
      }) || [];

      await SearchIndex.findOneAndUpdate(
        { contentId, contentType },
        {
          contentId,
          contentType,
          title: content.title,
          description: content.description,
          genres: genreIds,
          cast: castNames,
          director: content.director,
          languageCode: content.languageId ? content.languageId.toString() : null, // Store as string to avoid conflict
          releaseDate: content.releaseDate,
          rating: content.rating,
          isActive: content.isActive
        },
        { upsert: true, new: true, session }
      );
    } catch (error) {
      logger.error('ContentService.updateSearchIndex error:', error);
      // Don't throw - search index update failure shouldn't break content creation
    }
  }

  /**
   * Get paginated content list
   * @param {Object} Model - Mongoose model
   * @param {Object} query - Query object
   * @param {Object} options - Options (page, limit, sort, populate)
   * @returns {Promise<Object>} Paginated results
   */
  static async getPaginatedContent(Model, query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = { createdAt: -1 },
        populate = [],
        select = null,
        lean = false
      } = options;

      const skip = (page - 1) * limit;

      let queryBuilder = Model.find(query);

      // Apply populate
      if (Array.isArray(populate) && populate.length > 0) {
        populate.forEach(pop => {
          queryBuilder = queryBuilder.populate(pop);
        });
      } else if (typeof populate === 'string') {
        queryBuilder = queryBuilder.populate(populate);
      }

      // Apply select
      if (select) {
        queryBuilder = queryBuilder.select(select);
      }

      // Apply lean for performance
      if (lean) {
        queryBuilder = queryBuilder.lean();
      }

      // Apply sort and pagination
      const [data, total] = await Promise.all([
        queryBuilder.sort(sort).limit(limit).skip(skip),
        Model.countDocuments(query)
      ]);

      return {
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('ContentService.getPaginatedContent error:', error);
      throw error;
    }
  }
}

module.exports = ContentService;

