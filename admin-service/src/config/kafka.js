const { Kafka, logLevel } = require('kafkajs');
const logger = require('./logger');
const { config } = require('.');

const kafka = new Kafka({
     clientId: config.KAFKA_CLIENT_ID,
     brokers: [config.KAFKA_BROKER || 'localhost:9093'],
     logLevel: logLevel.ERROR,
     retry: {
          initialRetryTime: 300,
          retries: 8,
          maxRetryTime: 30000,
     },
});

const kafkaAdmin = kafka.admin();

const producer = kafka.producer({
     allowAutoTopicCreation: true,
     transactionTimeout: 30000,
     idempotent: true,
     maxInFlightRequests: 5,
     retry: {
          retries: 5,
     },
});

let isConnected = false;

const connectProducer = async () => {
     if (!isConnected) {
          await producer.connect();
          isConnected = true;
          logger.info('Kafka producer connected');
     }
};

const disconnectProducer = async () => {
     if (isConnected) {
          await producer.disconnect();
          isConnected = false;
          logger.info('Kafka producer disconnected');
     }
};

const createTopics = async () => {
     await kafkaAdmin.connect();

     try {
          const topics = [
               'admin.station.created',
               'admin.train.created',
               'admin.route.created',
               'admin.schedule.created',
               'admin.schedule.cancelled',
          ];

          const created = await kafkaAdmin.createTopics({
               topics: topics.map(topic => ({
                    topic,
                    numPartitions: 1,
                    replicationFactor: 1,
               })),
               waitForLeaders: true,
          });

          if (created) {
               logger.info('Kafka topics created successfully');
          } else {
               logger.info('Kafka topics already exist');
          }
     } finally {
          await kafkaAdmin.disconnect();
     }
};

module.exports = {
     kafka,
     producer,
     connectProducer,
     disconnectProducer,
     createTopics,
};
























































