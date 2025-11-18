const Series = require('../../models/Series');
const Season = require('../../models/Season');
const Episode = require('../../models/Episode');
const SearchIndex = require('../../models/SearchIndex');
const logger = require('../../utils/logger');

// Series CRUD
const createSeries = async (req, res, next) => {
  try {
    const seriesData = req.body;
    const series = new Series(seriesData);
    await series.save();

    // Update search index
    await SearchIndex.findOneAndUpdate(
      { contentId: series._id, contentType: 'Series' },
      {
        contentId: series._id,
        contentType: 'Series',
        title: series.title,
        description: series.description,
        genres: series.genres,
        cast: series.cast?.map(c => c.name) || [],
        director: series.director,
        languageCode: series.languageId ? series.languageId.toString() : null, // Store as string to avoid conflict
        releaseDate: series.releaseDate,
        rating: series.rating,
        isActive: series.isActive
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      data: series
    });
  } catch (error) {
    logger.error('Create series error:', error);
    next(error);
  }
};

const getSeries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const series = await Series.find(query)
      .populate('genres')
      .sort({ createdAt: -1 })
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
      .populate('seasons');

    if (!series) {
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

const updateSeries = async (req, res, next) => {
  try {
    const series = await Series.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('genres');

    if (!series) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    // Update search index
    await SearchIndex.findOneAndUpdate(
      { contentId: series._id, contentType: 'Series' },
      {
        title: series.title,
        description: series.description,
        genres: series.genres,
        cast: series.cast?.map(c => c.name) || [],
        director: series.director,
        languageCode: series.languageId ? series.languageId.toString() : null, // Store as string to avoid conflict
        releaseDate: series.releaseDate,
        rating: series.rating,
        isActive: series.isActive
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: series
    });
  } catch (error) {
    logger.error('Update series error:', error);
    next(error);
  }
};

const deleteSeries = async (req, res, next) => {
  try {
    const series = await Series.findByIdAndDelete(req.params.id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    // Delete all seasons and episodes
    await Season.deleteMany({ series: series._id });
    await Episode.deleteMany({ series: series._id });

    // Remove from search index
    await SearchIndex.deleteOne({ contentId: series._id, contentType: 'Series' });

    res.json({
      success: true,
      message: 'Series deleted successfully'
    });
  } catch (error) {
    logger.error('Delete series error:', error);
    next(error);
  }
};

// Season CRUD
const createSeason = async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    const seasonData = { ...req.body, series: seriesId };
    const season = new Season(seasonData);
    await season.save();

    // Add season to series
    await Series.findByIdAndUpdate(seriesId, {
      $push: { seasons: season._id }
    });

    res.status(201).json({
      success: true,
      data: season
    });
  } catch (error) {
    logger.error('Create season error:', error);
    next(error);
  }
};

const getSeasons = async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    const seasons = await Season.find({ series: seriesId })
      .populate('episodes')
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

const updateSeason = async (req, res, next) => {
  try {
    const season = await Season.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    res.json({
      success: true,
      data: season
    });
  } catch (error) {
    logger.error('Update season error:', error);
    next(error);
  }
};

const deleteSeason = async (req, res, next) => {
  try {
    const season = await Season.findByIdAndDelete(req.params.id);

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    // Delete all episodes
    await Episode.deleteMany({ season: season._id });

    // Remove season from series
    await Series.findByIdAndUpdate(season.series, {
      $pull: { seasons: season._id }
    });

    res.json({
      success: true,
      message: 'Season deleted successfully'
    });
  } catch (error) {
    logger.error('Delete season error:', error);
    next(error);
  }
};

// Episode CRUD
const createEpisode = async (req, res, next) => {
  try {
    const { seasonId } = req.params;
    const season = await Season.findById(seasonId);

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    const episodeData = {
      ...req.body,
      series: season.series,
      season: seasonId
    };
    const episode = new Episode(episodeData);
    await episode.save();

    // Add episode to season
    await Season.findByIdAndUpdate(seasonId, {
      $push: { episodes: episode._id }
    });

    res.status(201).json({
      success: true,
      data: episode
    });
  } catch (error) {
    logger.error('Create episode error:', error);
    next(error);
  }
};

const getEpisodes = async (req, res, next) => {
  try {
    const { seasonId } = req.params;
    const episodes = await Episode.find({ season: seasonId })
      .sort({ episodeNumber: 1 });

    res.json({
      success: true,
      data: episodes
    });
  } catch (error) {
    logger.error('Get episodes error:', error);
    next(error);
  }
};

const updateEpisode = async (req, res, next) => {
  try {
    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!episode) {
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
    logger.error('Update episode error:', error);
    next(error);
  }
};

const deleteEpisode = async (req, res, next) => {
  try {
    const episode = await Episode.findByIdAndDelete(req.params.id);

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    // Remove episode from season
    await Season.findByIdAndUpdate(episode.season, {
      $pull: { episodes: episode._id }
    });

    res.json({
      success: true,
      message: 'Episode deleted successfully'
    });
  } catch (error) {
    logger.error('Delete episode error:', error);
    next(error);
  }
};

module.exports = {
  createSeries,
  getSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
  createSeason,
  getSeasons,
  updateSeason,
  deleteSeason,
  createEpisode,
  getEpisodes,
  updateEpisode,
  deleteEpisode
};

