const asyncHandler = require('../utils/asyncHandler');
const { UnauthorizedError } = require('../utils/error');
const { verifyAccessToken } = require('../utils/auth');
const { redis: redisClient } = require('../config/redis');
const prisma = require('../config/prisma');
const { config } = require('../config');

const extractToken = (req) => {
    if (req.cookies?.accessToken) return req.cookies.accessToken;

    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);

    return null;
};

const authenticate = asyncHandler(async (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        throw new UnauthorizedError('Authentication required');
    }

    let payload;
    try {
        payload = verifyAccessToken(token);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new UnauthorizedError('Access token expired');
        }
        throw new UnauthorizedError('Invalid access token');
    }

    // Redis cache first (set at login), DB as fallback
    const cacheKey = `user:${payload.id}`;
    let user = null;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
        user = JSON.parse(cached);
    } else {
        const dbUser = await prisma.user.findUnique({ where: { id: payload.id } });
        if (dbUser) {
            const { password, ...safeUser } = dbUser;
            user = safeUser;
            await redisClient.set(cacheKey, JSON.stringify(user), 'EX', config.REDIS_USER_TIL);
        }
    }

    if (!user) {
        throw new UnauthorizedError('User no longer exists');
    }

    req.user = user;
    next();
});

module.exports = { authenticate };