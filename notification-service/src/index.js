const logger = require('./config/logger');
const emailConsumer = require('./kafka/consumer/email.consumer');

(async () => {
     try {
          await emailConsumer.start();
     } catch (error) {
          logger.error('Failed to start email consumer', { error: error.message });
          process.exit(1);
     }
})();

for (const signal of ['SIGINT', 'SIGTERM']) {
     process.on(signal, async () => {
          await emailConsumer.stop();
          process.exit(0);
     });
}