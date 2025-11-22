const Cast = require('../../models/Cast');
const logger = require('../../utils/logger');

const createCast = async (req, res, next) => {
  try {
    const cast = new Cast(req.body);
    await cast.save();

    res.status(201).json({
      success: true,
      data: cast
    });
  } catch (error) {
    logger.error('Create cast error:', error);
    next(error);
  }
};

const getCast = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const query = {};

    // Search by name or role
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } }
      ];
    }

    // Active filter
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Fetch paginated cast
    const cast = await Cast.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Total count
    const total = await Cast.countDocuments(query);

    res.json({
      success: true,
      data: cast,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get cast error:", error);
    next(error);
  }
};

const getCastById = async (req, res, next) => {
  try {
    const cast = await Cast.findById(req.params.id);

    if (!cast) {
      return res.status(404).json({
        success: false,
        message: 'Cast not found'
      });
    }

    res.json({
      success: true,
      data: cast
    });
  } catch (error) {
    logger.error('Get cast by ID error:', error);
    next(error);
  }
};

const updateCast = async (req, res, next) => {
  try {
    const cast = await Cast.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!cast) {
      return res.status(404).json({
        success: false,
        message: 'Cast not found'
      });
    }

    res.json({
      success: true,
      data: cast
    });
  } catch (error) {
    logger.error('Update cast error:', error);
    next(error);
  }
};

const deleteCast = async (req, res, next) => {
  try {
    const cast = await Cast.findByIdAndDelete(req.params.id);

    if (!cast) {
      return res.status(404).json({
        success: false,
        message: 'Cast not found'
      });
    }

    res.json({
      success: true,
      message: 'Cast deleted successfully'
    });
  } catch (error) {
    logger.error('Delete cast error:', error);
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

    const cast = await Cast.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!cast) {
      return res.status(404).json({
        success: false,
        message: 'Cast not found'
      });
    }

    res.json({
      success: true,
      message: `Cast ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: cast
    });
  } catch (error) {
    logger.error('Toggle cast active status error:', error);
    next(error);
  }
};

module.exports = {
  createCast,
  getCast,
  getCastById,
  updateCast,
  deleteCast,
  toggleActive
};

