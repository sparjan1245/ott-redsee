const Category = require('../../models/Category');
const logger = require('../../utils/logger');

const createCategory = async (req, res, next) => {
  try {
    const { name, slug } = req.body;

    // Check for existing category with same name or slug
    const existingCategory = await Category.findOne({
      $or: [{ name }, { slug }]
    });

    if (existingCategory) {
      let message = "Category already exists with ";
      if (existingCategory.name === name && existingCategory.slug === slug) {
        message += "the same name and slug.";
      } else if (existingCategory.name === name) {
        message += "the same name.";
      } else {
        message += "the same slug.";
      }

      return res.status(400).json({
        success: false,
        message
      });
    }

    // Create new category
    const category = new Category(req.body);
    await category.save();

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Create category error:', error);
    next(error);
  }
};
const getAllCategories = async (req, res, next) => {
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

    // Fetch paginated categories
    const categories = await Category.find(query)
      // .sort({ sortOrder: 1, name: 1 })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Total count
    const total = await Category.countDocuments(query);

    res.json({
      success: true,
      data: categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error("Get categories error:", error);
    next(error);
  }
};
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);



    res.json({
      success: true,
      data: category,
    });

  } catch (error) {
    logger.error("Get category by id error:", error);
    next(error);
  }
};
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Update category error:', error);
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error('Delete category error:', error);
    next(error);
  }
};

const toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean",
      });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      message: `Category ${isActive ? "activated" : "deactivated"} successfully`,
      data: category,
    });
  } catch (error) {
    logger.error("Toggle status error:", error);
    next(error);
  }
};


module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleActive
};

