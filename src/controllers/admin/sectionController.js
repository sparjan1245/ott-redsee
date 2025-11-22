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
    const { page = 1, limit = 20, search, type, isActive } = req.query;
    const query = {};

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Active filter
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Fetch paginated sections
    const sections = await Section.find(query)
      .populate('items.contentId')
      .sort({ sortOrder: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Total count
    const total = await Section.countDocuments(query);

    res.json({
      success: true,
      data: sections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get sections error:", error);
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

    const section = await Section.findByIdAndUpdate(
      id,
      { isActive },
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
      message: `Section ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: section
    });
  } catch (error) {
    logger.error('Toggle section active status error:', error);
    next(error);
  }
};

module.exports = {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  toggleActive
};

