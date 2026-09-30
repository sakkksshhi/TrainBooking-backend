const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { config } = require('./config');
const logger = require('./config/logger');

const {corsMiddleware} = require('./middlewares/cors.middleware');
const errorHandler = require('./middlewares/error.middleware');
const {reqLogger} = require('./middlewares/req.middleware');

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(reqLogger);
app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('User service is running');
} );

app.get('/health', (req, res) => {
  res.send('User service is healthy');
});

app.use(errorHandler); 

const startServer = async () => {
  try {
    const server = app.listen(config.PORT, () => {
      logger.info(`User service is running on port ${config.PORT}`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};