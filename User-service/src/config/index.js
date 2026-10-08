require('dotenv').config();

const config = {
    SERVICE_NAME: require('../../package.json').name,

    PORT: process.env.PORT || 4001,

    NODE_ENV: process.env.NODE_ENV || "development",

    LOG_LEVEL: process.env.LOG_LEVEL || "info",

    REDIS_URL: process.env.REDIS_URL || "redis://:irctcpass@redis:6379",

    KAFKA_BROKER: process.env.KAFKA_BROKER || "kafka:9092",

    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "http://localhost:4000",

    OTP_TTL: Number(process.env.OTP_TTL) || 300,

    OTP_RATE_MAX_PER_HOUR: Number(process.env.OTP_RATE_LIMIT) || 5,

    OTP_MAX_VERIFY_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS) || 5,

    OTP_HMAC_SECRET: process.env.OTP_HMAC_SECRET,

    MAIL_USER: process.env.MAIL_USER,
    
    MAIL_PASSWORD: process.env.MAIL_PASSWORD, 
};

module.exports = { config };
  