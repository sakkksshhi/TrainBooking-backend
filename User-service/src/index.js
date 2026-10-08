const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { config } = require('./config');
const logger = require('./config/logger');
const RedisClient = require('./config/redis');

const authRoutes = require('./routes/authroute');

const {corsMiddleware} = require('./middleware/cors.middleware');
const errorHandler = require('./middleware/error.middleware');
const {reqLogger} = require('./middleware/req.middleware');

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(reqLogger);
app.use(cookieParser());
app.use(express.json());
app.use('/api/auth', authRoutes);


app.get('/', (req, res) => {
  res.send('User service is running');
} );

app.get('/health', (req, res) => {
  res.send('User service is healthy');
});

app.use(errorHandler); 

const startServer = async () => {
  try {
      RedisClient.getInstance();
    const server = app.listen(config.PORT, () => {
      logger.info(`User service is running on port ${config.PORT}`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();