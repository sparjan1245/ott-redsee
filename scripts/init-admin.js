require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const logger = require('../src/utils/logger');

async function initAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URI_PROD);
    logger.info('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'admin@redsee.com' });

    if (existingAdmin) {
      logger.info('Admin already exists');
      process.exit(0);
    }

    // Create super admin
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL || 'admin@redsee.com',
      password: process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!',
      name: 'Super Admin',
      role: 'super_admin',
      isActive: true
    });

    await admin.save();
    logger.info('Super admin created successfully');
    logger.info(`Email: ${admin.email}`);
    logger.info('Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    logger.error('Error initializing admin:', error);
    process.exit(1);
  }
}

initAdmin();

