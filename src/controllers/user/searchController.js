const SearchIndex = require('../../models/SearchIndex');
const logger = require('../../utils/logger');

const search = async (req, res, next) => {
  try {
    const { q, type, genre, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const query = {
      isActive: true,
      $text: { $search: q }
    };

    if (type) {
      query.contentType = type;
    }

    if (genre) {
      query.genres = genre;
    }

    const results = await SearchIndex.find(query)
      .sort({ score: { $meta: 'textScore' }, popularity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SearchIndex.countDocuments(query);

    res.json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Search error:', error);
    next(error);
  }
};

module.exports = {
  search
};

