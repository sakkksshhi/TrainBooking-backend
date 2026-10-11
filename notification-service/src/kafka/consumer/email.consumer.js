const { kafka } = require('../../config/kafka');
const logger = require('../../config/logger');
const { sendOtpMail, sendVerifiedMail } = require('../../services/mailer'); // adjust path
const KAFKA_TOPICS = {
     OTP_EMAIL: 'notification.email.otp',
     WELCOME_EMAIL: 'notification.email.welcome',
};
const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class EmailConsumer {
     constructor() {
          this.consumer = kafka.consumer({ groupId: 'notification-service-email' });
          this.dlqProducer = kafka.producer();

          this.handlers = {
               [KAFKA_TOPICS.OTP_EMAIL]: (e) => sendOtpMail(e.email, e.otp, e.ttlMinutes),
               [KAFKA_TOPICS.WELCOME_EMAIL]: (e) => sendVerifiedMail(e.email, e.firstName),
          };
     }

     // Broker auto-create is off, so the consumer makes sure its topics exist
     async ensureTopics() {
          const admin = kafka.admin();
          await admin.connect();
          try {
               await admin.createTopics({
                    waitForLeaders: true,
                    topics: [
                         {
                              topic: KAFKA_TOPICS.OTP_EMAIL,
                              numPartitions: 3,
                              replicationFactor: 1,
                              configEntries: [{ name: 'retention.ms', value: String(10 * 60 * 1000) }],
                         },
                         { topic: KAFKA_TOPICS.WELCOME_EMAIL, numPartitions: 3, replicationFactor: 1 },
                         {
                              topic: `${KAFKA_TOPICS.OTP_EMAIL}.dlq`,
                              numPartitions: 1,
                              replicationFactor: 1,
                              configEntries: [{ name: 'retention.ms', value: String(24 * 60 * 60 * 1000) }],
                         },
                         { topic: `${KAFKA_TOPICS.WELCOME_EMAIL}.dlq`, numPartitions: 1, replicationFactor: 1 },
                    ],
               });
          } finally {
               await admin.disconnect();
          }
     }

     async start() {
          await this.ensureTopics();
          await this.dlqProducer.connect();
          await this.consumer.connect();
          await this.consumer.subscribe({
               topics: Object.keys(this.handlers),
               fromBeginning: false,
          });

          await this.consumer.run({
               eachMessage: async ({ topic, message }) => this.processMessage(topic, message),
          });

          logger.info('Email consumer started', { topics: Object.keys(this.handlers) });
     }

     async processMessage(topic, message) {
          let event;
          try {
               event = JSON.parse(message.value.toString());
          } catch (error) {
               await this.sendToDlq(topic, message, 'Invalid JSON');
               return;
          }

          if (!event?.email) {
               await this.sendToDlq(topic, message, 'Missing email in payload');
               return;
          }

          // An expired OTP is useless to the user, so don't send it
          if (topic === KAFKA_TOPICS.OTP_EMAIL) {
               const ageMs = Date.now() - Number(message.timestamp);
               if (ageMs > (event.ttlMinutes || 5) * 60 * 1000) {
                    logger.warn(`Skipped expired message on ${topic}`);
                    return;
               }
          }

          try {
               await this.handleWithRetry(topic, event);
               // Never log the event itself, the OTP is in it
               logger.info(`Processed message from ${topic}`, { key: message.key?.toString() });
          } catch (error) {
               await this.sendToDlq(topic, message, error.message);
               logger.error(`Moved message from ${topic} to DLQ`, { error: error.message });
          }
     }

     async handleWithRetry(topic, event) {
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
               try {
                    await this.handlers[topic](event);
                    return;
               } catch (error) {
                    logger.warn(`[${topic}] attempt ${attempt} failed: ${error.message}`);
                    if (attempt === MAX_ATTEMPTS) throw error;
                    await sleep(1000 * 2 ** (attempt - 1)); // 1s, then 2s
               }
          }
     }

     async sendToDlq(topic, message, reason) {
          await this.dlqProducer.send({
               topic: `${topic}.dlq`,
               messages: [{
                    key: message.key,
                    value: message.value,
                    headers: { error: String(reason).slice(0, 500) },
               }],
          });
     }

     async stop() {
          await this.consumer.disconnect().catch(() => {});
          await this.dlqProducer.disconnect().catch(() => {});
          logger.info('Email consumer stopped');
     }
}

module.exports = new EmailConsumer();