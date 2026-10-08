const {TooManyRequestsError} = require('../utils/error');
const { config } = require('../config');
const RedisClient = require('../config/redis');
const redisClient = RedisClient.getInstance();
const otpGenerator = require('otp-generator');
const crypto = require('crypto');
const RATE_MAX = parseInt(config.OTP_RATE_MAX_PER_HOUR || '5', 10);
const OTP_TTL = parseInt(config.OTP_TTL || '300', 10);
const HMAC_SECRET = config.OTP_HMAC_SECRET;

function hmacFor(email, otp) {
    return crypto.createHmac('sha256', HMAC_SECRET).update(email + ":" + otp).digest('hex');
}
async function generateAndStoreOtp(meta) {
    const ratekey = `otp:rate:${meta.email}`;
    const sentCount = parseInt(await redisClient.get(ratekey)|| '0', 10);
    if (sentCount >= RATE_MAX) {
        throw new TooManyRequestsError('Too many OTP requests. Please try again later.','OTP_RATE_LIMIT');
    }

    const otp = otpGenerator.generate(6, { 
        upperCaseAlphabets: false, 
        lowerCaseAlphabets: false,
        specialChars: false });
    
    const otpSessionId = crypto.randomUUID();
    const hashed = hmacFor(meta.email, otp);
    await redisClient.set(`otp:session:${otpSessionId}`, JSON.stringify({ 
        hashedOtp: hashed,
        meta
    }), 'EX', OTP_TTL);
    await redisClient.incr(ratekey);
    await redisClient.expire(ratekey, 3600);// 1 hour
    return { otp, otpSessionId };
}

module.exports = { generateAndStoreOtp};