const { consumer, producer, connectProducer } = require('../../config/kafka');
const searchService = require('../../services/search.service');
const logger = require('../../config/logger');
const { KAFKA_TOPICS } = require('../../../../admin-service/src/kafka/constants/kafka-topics');

class SearchConsumer {
     async start() {
          await consumer.connect();
          await connectProducer(); // needed for DLQ publishing
          logger.info('Search consumer connected');

          await consumer.subscribe({
               topics: [
                    KAFKA_TOPICS.STATION_CREATED,
                    KAFKA_TOPICS.TRAIN_CREATED,
                    KAFKA_TOPICS.ROUTE_CREATED,
                    KAFKA_TOPICS.SCHEDULE_CREATED,
                    KAFKA_TOPICS.SCHEDULE_CANCELLED,
                    KAFKA_TOPICS.SEAT_AVAILABILITY_UPDATED,

               ],
               fromBeginning: true,
          });

          await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        try {
            if (!message.value) {
                throw new Error('Empty Kafka message');
            }

            const parsedValue = JSON.parse(message.value.toString());

            logger.info(`Processing ${topic}`, {
                partition,
                offset: message.offset,
            });

            switch (topic) {
                case KAFKA_TOPICS.STATION_CREATED:
                    await searchService.indexStation(parsedValue);
                    break;

                case KAFKA_TOPICS.TRAIN_CREATED:
                    await searchService.indexTrain(parsedValue);
                    break;

                case KAFKA_TOPICS.ROUTE_CREATED:
                    await searchService.indexTrainRoute(parsedValue);
                    break;

                case KAFKA_TOPICS.SCHEDULE_CREATED:
                    await searchService.indexSchedule(parsedValue);
                    break;

                case KAFKA_TOPICS.SCHEDULE_CANCELLED:
                    await searchService.cancelSchedule(parsedValue);
                    break;

                case KAFKA_TOPICS.SEAT_AVAILABILITY_UPDATED:
                    await searchService.updateSeatAvailability(parsedValue);
                    break;

                default:
                    logger.warn(`Unknown topic: ${topic}`);
            }

        } catch (error) {
            logger.error(`Failed processing message from ${topic}`, {
                partition,
                offset: message.offset,
                error: error.message,
            });

            try {
                await producer.send({
                    topic: KAFKA_TOPICS.DLQ_SEARCH,
                    messages: [{
                        key: message.key,
                        value: message.value,
                        headers: {
                            originalTopic: topic,
                            originalPartition: String(partition),
                            originalOffset: message.offset,
                            error: error.message,
                            failedAt: new Date().toISOString(),
                        },
                    }],
                });

                logger.warn('Failed message sent to Search DLQ');

            } catch (dlqError) {
                logger.error('Failed to publish message to DLQ', {
                    error: dlqError.message,
                });

                throw dlqError;
            }
        }
    },
});
          logger.info('Search consumer running...');
     }
}

module.exports = new SearchConsumer();