const winston = require('winston');
const { config } = require('.');

const logger = winston.createLogger({
     level: config.LOG_LEVEL,
     defaultMeta: { service: config.SERVICE_NAME },
     format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ level, message, timestamp, service, stack, ...meta }) => {
               const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
               return `[${timestamp}] [${level}] [${service}]: ${message}${extra}`;
          })
     ),
     transports: [new winston.transports.Console()],
});

module.exports = logger;