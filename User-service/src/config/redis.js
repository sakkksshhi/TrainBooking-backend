const Redis = require('ioredis');
const { config } = require('.');
const logger = require('./logger');

class RedisClient {
    static instance;
    static isConnected = false;

    constructor() {}

    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new Redis(config.REDIS_URL, {
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
            });
            RedisClient.setupEventListeners();
        }
        return RedisClient.instance;
    }

    static setupEventListeners() {
        RedisClient.instance.on('connect', () => {
            RedisClient.isConnected = true;
            logger.info('Redis client connected');
        });
        // ...
    }
}