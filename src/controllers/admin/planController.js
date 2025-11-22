const Plan = require('../../models/Plan');
const logger = require('../../utils/logger');

const createPlan = async (req, res, next) => {
  try {
    const plan = new Plan(req.body);
    await plan.save();

    res.status(201).json({
      success: true,
      data: plan
    });
  } catch (error) {
    logger.error('Create plan error:', error);
    next(error);
  }
};

const getPlans = async (req, res, next) => {
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

    // Fetch paginated plans
    const plans = await Plan.find(query)
      .sort({ sortOrder: 1, price: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Total count
    const total = await Plan.countDocuments(query);

    res.json({
      success: true,
      data: plans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get plans error:", error);
    next(error);
  }
};

const getPlanById = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    logger.error('Get plan by ID error:', error);
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    logger.error('Update plan error:', error);
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    logger.error('Delete plan error:', error);
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

    const plan = await Plan.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      message: `Plan ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: plan
    });
  } catch (error) {
    logger.error('Toggle plan active status error:', error);
    next(error);
  }
};

module.exports = {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  toggleActive
};

