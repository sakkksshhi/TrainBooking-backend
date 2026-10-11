const { Kafka, logLevel } = require('kafkajs');
const { config } = require('.');

const kafka = new Kafka({
    clientId: config.KAFKA_CLIENT_ID,
    brokers: config.KAFKA_BROKER.split(','),
    logLevel: logLevel.ERROR,
    retry: {
        initialRetryTime: 300,
        retries: 8,
        maxRetryTime: 30000,
    },
});

module.exports = { kafka };