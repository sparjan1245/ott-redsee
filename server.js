require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const logger = require('./src/utils/logger');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const adminRoutes = require('./src/routes/admin');
const userRoutes = require('./src/routes/user');

const app = express();
// Render uses PORT environment variable (defaults to 10000)
const PORT = process.env.PORT || 3000;

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RedSee OTT Platform API',
      version: '1.0.0',
      description: 'Complete OTT streaming platform backend API',
      contact: {
        name: 'API Support',
        email: 'support@redsee.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(mongoSanitize());

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/v1/', limiter);

// API Documentation
app.use('/api/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'RedSee OTT Platform API',
    version: '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}/api/v1/api-docs`,
    endpoints: {
      admin: `${req.protocol}://${req.get('host')}/api/v1/admin`,
      user: `${req.protocol}://${req.get('host')}/api/v1/user`,
      health: `${req.protocol}://${req.get('host')}/api/v1/health`
    },
    status: 'running'
  });
});

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/user', userRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;

if (!mongoUri) {
  logger.error('MongoDB connection string not found. Please set MONGODB_URI or MONGODB_URI_PROD in your .env file');
  logger.info('Example: MONGODB_URI=mongodb://localhost:27017/redsee_ott');
  logger.info('Or use MongoDB Atlas: MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/redsee_ott');
  process.exit(1);
}

mongoose.connect(mongoUri)
.then(() => {
  logger.info('MongoDB connected successfully');
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    if (process.env.NODE_ENV === 'production') {
      logger.info(`Production server ready`);
    } else {
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
    }
  });
})
.catch((error) => {
  logger.error('MongoDB connection error:', error.message);
  logger.error('');
  logger.error('⚠️  MongoDB is not running or connection string is incorrect.');
  logger.error('');
  logger.error('To fix this, you have 3 options:');
  logger.error('');
  logger.error('1. Start MongoDB locally:');
  logger.error('   - Install MongoDB: https://www.mongodb.com/try/download/community');
  logger.error('   - Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo:7');
  logger.error('');
  logger.error('2. Use Docker Compose (includes MongoDB):');
  logger.error('   docker-compose up -d mongodb');
  logger.error('');
  logger.error('3. Use MongoDB Atlas (cloud):');
  logger.error('   - Sign up at https://www.mongodb.com/cloud/atlas');
  logger.error('   - Create a cluster and get connection string');
  logger.error('   - Set MONGODB_URI_PROD in your .env file');
  logger.error('');
  process.exit(1);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;

