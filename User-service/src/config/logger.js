const winston = require('winston');
const { config } = require('.');

const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    defaultMeta: { service: config.SERVICE_NAME },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, service}) => {
            return `${timestamp} [${service}] ${level}: ${message}`;
        })
    ),
    transports: [new winston.transports.Console()]
});

module.exports = logger;
