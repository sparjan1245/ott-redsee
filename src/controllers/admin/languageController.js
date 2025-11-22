const Language = require('../../models/Language');
const logger = require('../../utils/logger');

const createLanguage = async (req, res, next) => {
  try {
    const language = new Language(req.body);
    await language.save();

    res.status(201).json({
      success: true,
      data: language
    });
  } catch (error) {
    logger.error('Create language error:', error);
    next(error);
  }
};

const getLanguages = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const query = {};

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Active filter
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Fetch paginated languages
    const languages = await Language.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Total count
    const total = await Language.countDocuments(query);

    res.json({
      success: true,
      data: languages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get languages error:", error);
    next(error);
  }
};

const getLanguageById = async (req, res, next) => {
  try {
    const language = await Language.findById(req.params.id);

    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    res.json({
      success: true,
      data: language
    });
  } catch (error) {
    logger.error('Get language by ID error:', error);
    next(error);
  }
};

const updateLanguage = async (req, res, next) => {
  try {
    const language = await Language.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    res.json({
      success: true,
      data: language
    });
  } catch (error) {
    logger.error('Update language error:', error);
    next(error);
  }
};

const deleteLanguage = async (req, res, next) => {
  try {
    const language = await Language.findByIdAndDelete(req.params.id);

    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    res.json({
      success: true,
      message: 'Language deleted successfully'
    });
  } catch (error) {
    logger.error('Delete language error:', error);
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

    const language = await Language.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    res.json({
      success: true,
      message: `Language ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: language
    });
  } catch (error) {
    logger.error('Toggle language active status error:', error);
    next(error);
  }
};

module.exports = {
  createLanguage,
  getLanguages,
  getLanguageById,
  updateLanguage,
  deleteLanguage,
  toggleActive
};

