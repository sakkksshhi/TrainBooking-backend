require('dotenv').config();

const config = {
    KAFKA_BROKER: process.env.KAFKA_BROKER || 'localhost:9093',
    KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'notification-service',
    MAIL_USER: process.env.MAIL_USER,
    MAIL_PASSWORD: process.env.MAIL_PASSWORD,
    APP_NAME: process.env.APP_NAME || 'IRCTC',
};

for (const key of ['MAIL_USER', 'MAIL_PASSWORD']) {
    if (!config[key]) {
        console.error(`Missing required env var: ${key}`);
        process.exit(1);
    }
}

module.exports = { config };
