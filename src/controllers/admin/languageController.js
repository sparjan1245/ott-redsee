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
    const { isActive } = req.query;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const languages = await Language.find(query).sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    logger.error('Get languages error:', error);
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

module.exports = {
  createLanguage,
  getLanguages,
  getLanguageById,
  updateLanguage,
  deleteLanguage
};

