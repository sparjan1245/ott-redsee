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
    const { isActive } = req.query;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const plans = await Plan.find(query).sort({ sortOrder: 1, price: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Get plans error:', error);
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

module.exports = {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan
};

