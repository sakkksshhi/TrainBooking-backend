const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true
});

const config = {
    PORT: process.env.PORT || 4000,
    SERVICE_NAME: require('../../package.json').name,
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    TRUST_PROXY: parseInt(process.env.TRUST_PROXY || '0', 10),

    REDIS_URL: process.env.REDIS_URL,

    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean),

    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,

    RATE_LIMIT_WINDOW_MS: parseInt(
        process.env.RATE_LIMIT_WINDOW_MS || '900000',
        10
    ),

    RATE_LIMIT_MAX_REQUESTS: parseInt(
        process.env.RATE_LIMIT_MAX_REQUESTS || '100',
        10
    ),

    OTP_RATE_MAX_PER_HOUR: parseInt(
        process.env.OTP_RATE_LIMIT || '5',
        10
    ),

    SERVICES: {
        USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:4001',
        SEARCH_SERVICE_URL: process.env.SEARCH_SERVICE_URL || 'http://localhost:4002',
        ADMIN_SERVICE_URL: process.env.ADMIN_SERVICE_URL || 'http://localhost:4003',
        BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || 'http://localhost:4005',
        PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4006',
        INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL || 'http://localhost:4007'
    },

    SERVICE_TIMEOUT_MS: parseInt(
        process.env.SERVICE_TIMEOUT_MS || '10000',
        10
    ),

    CIRCUIT_BREAKER_THRESHOLD: parseInt(
        process.env.CIRCUIT_BREAKER_THRESHOLD || '5',
        10
    ),

    CIRCUIT_BREAKER_TIMEOUT: parseInt(
        process.env.CIRCUIT_BREAKER_TIMEOUT || '60000',
        10
    ),
};

const requiredConfig = ['JWT_ACCESS_SECRET', 'REDIS_URL'];

requiredConfig.forEach((key) => {
    if (!config[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

module.exports = { config };
