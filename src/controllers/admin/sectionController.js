const Section = require('../../models/Section');
const logger = require('../../utils/logger');

const createSection = async (req, res, next) => {
  try {
    const section = new Section(req.body);
    await section.save();

    res.status(201).json({
      success: true,
      data: section
    });
  } catch (error) {
    logger.error('Create section error:', error);
    next(error);
  }
};

const getSections = async (req, res, next) => {
  try {
    const { type, isActive } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const sections = await Section.find(query)
      .populate('items.contentId')
      .sort({ sortOrder: 1 });

    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    logger.error('Get sections error:', error);
    next(error);
  }
};

const getSectionById = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate('items.contentId');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    logger.error('Get section by ID error:', error);
    next(error);
  }
};

const updateSection = async (req, res, next) => {
  try {
    const section = await Section.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('items.contentId');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    logger.error('Update section error:', error);
    next(error);
  }
};

const deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    logger.error('Delete section error:', error);
    next(error);
  }
};

module.exports = {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection
};

