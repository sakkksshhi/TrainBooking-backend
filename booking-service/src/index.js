require('dotenv').config();

const express = require('express');
const helmet = require('helmet');

const { config } = require('./config');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const {redis} = require('./config/redis');
const { connectProducer } = require('./config/kafka');

const {corsMiddleware} = require('./middlewares/cors.middleware');
const {reqLogger} = require('./middlewares/req.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

const bookingRoutes = require('./routes/booking.route');
const bookingConsumer = require('./kafka/consumer/booking.consumer');
const { startBookingExpiryJob } = require('./utils/bookingExpiry');

const app = express();

// Security and request parsing
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Application middleware
app.use(corsMiddleware);
app.use(reqLogger);

// Health check
app.get('/health', async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Booking Service is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Booking routes
app.use('/api/bookings', bookingRoutes);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Start service
const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected');

    await redis.ping();
    logger.info('Redis connected');

    await connectProducer();
    logger.info('Kafka producer connected');

    await bookingConsumer.start();
    logger.info('Booking consumer started');

    startBookingExpiryJob();
    logger.info('Booking expiry job started');

    app.listen(config.PORT, () => {
      logger.info(
        `${config.SERVICE_NAME} is running on port ${config.PORT}`
      );
    });
  } catch (error) {
    console.error('STARTUP ERROR:', error);
    logger.error('Failed to start Booking Service', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();

module.exports = app;