const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { config } = require('./config');
const logger = require('./config/logger');
const { RedisClient } = require('./config/redis');
const prisma = require('./config/prisma');
const { connectProducer, disconnectProducer } = require('./config/kafka');

const authRoutes = require('./routes/authroute');
const userRoutes = require('./routes/userroute');

const { corsMiddleware } = require('./middleware/cors.middleware');
const errorHandler = require('./middleware/error.middleware');
const { reqLogger } = require('./middleware/req.middleware');

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(reqLogger);
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('User service is running');
});

app.get('/health', (req, res) => {
  res.send('User service is healthy');
});

app.use(errorHandler);

const startServer = async () => {
  try {
    RedisClient.getInstance();

    // Open the database and Kafka connections now, so the first request doesn't pay for them
    const warmups = await Promise.allSettled([prisma.$connect(), connectProducer()]);
    warmups.forEach((result, i) => {
      if (result.status === 'rejected') {
        logger.warn(`Warm-up ${i === 0 ? 'Prisma' : 'Kafka'} failed: ${result.reason.message}`);
      }
    });

    const server = app.listen(config.PORT, () => {
      logger.info(`User service is running on port ${config.PORT}`);
    });

    const shutdown = async () => {
      server.close();
      await disconnectProducer().catch(() => {});
      await prisma.$disconnect().catch(() => {});
      await RedisClient.closeConnection();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();