const { BadRequestError, ForbiddenError, UnauthorizedError } = require('../utils/error');
const { generateAndStoreOtp, verifyAndRetrieveOtp } = require('../utils/otp');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/auth');
const { sendOtpEmail, verifyOtpEmail } = require('../utils/email');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const { redis: redisClient } = require('../config/redis');
const { config } = require('../config');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

const sendOTP = async (firstname, lastname, rawEmail, password) => {
    const email = rawEmail.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new BadRequestError('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const meta = { firstname, lastname, email, hashedPassword };
    const { otp, otpSessionId } = await generateAndStoreOtp(meta);
    await sendOtpEmail(email, otp);
    return { otpSessionId };
};

const verifyOTP = async (otpSessionId, otp) => {
    const meta = await verifyAndRetrieveOtp(otpSessionId, otp);
    if (meta == null) {
        throw new BadRequestError('Invalid OTP or OTP has expired. Please request a new OTP.');
    }

    let user;
    try {
        user = await prisma.user.create({
            data: {
                firstname: meta.firstname,
                lastname: meta.lastname,
                email: meta.email,
                password: meta.hashedPassword,
                emailVerified: true,
            },
        });
    } catch (err) {
        if (err.code === 'P2002') {
            throw new BadRequestError('User with this email already exists');
        }
        throw err;
    }

    verifyOtpEmail(meta).catch((err) =>
        console.error('Confirmation email failed:', err.message)
    );

    return user;
};

const issueSession = async (user, deviceId) => {
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const { jti } = jwt.decode(refreshToken);

    await redisClient.set(
        `refresh:${user.id}:${deviceId}`, jti, 'EX', config.REFRESH_TOKEN_EXP_SEC
    );

    const { password: _pw, ...safeUser } = user;
    await redisClient.set(
        `user:${user.id}`, JSON.stringify(safeUser), 'EX', config.REDIS_USER_TIL
    );

    return { accessToken, refreshToken, loggedInUser: safeUser };
};

const login = async (email, password, deviceId) => {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (!existingUser) {
        throw new BadRequestError('Invalid email or password');
    }
    if (!existingUser.password) {
        throw new BadRequestError('This account uses Google sign-in');
    }

    const doesPasswordMatch = await bcrypt.compare(password, existingUser.password);
    if (!doesPasswordMatch) {
        throw new BadRequestError('Invalid email or password');
    }

    return issueSession(existingUser, deviceId);
};

const verifyGoogleIdToken = async (idToken, deviceId) => {
    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: config.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
    } catch (err) {
        throw new UnauthorizedError('Invalid Google token');
    }

    if (!payload?.email || !payload.email_verified) {
        throw new UnauthorizedError('Google email is not verified');
    }

    const email = payload.email.trim().toLowerCase();
    const googleId = payload.sub;

    // 1. Returning Google user
    const link = await prisma.authProvider.findUnique({
        where: { provider_providerId: { provider: 'google', providerId: googleId } },
        include: { user: true },
    });
    let user = link?.user;

    if (!user) {
        user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            // 2. Existing email/password user: link Google to that account
            await prisma.authProvider.create({
                data: { provider: 'google', providerId: googleId, userId: user.id },
            });
            if (!user.emailVerified) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { emailVerified: true },
                });
            }
        } else {
            // 3. New user: create the user and the provider link together
            user = await prisma.user.create({
                data: {
                    firstname: payload.given_name || email.split('@')[0],
                    lastname: payload.family_name || '',
                    email,
                    emailVerified: true,
                    AuthProviders: {
                        create: { provider: 'google', providerId: googleId },
                    },
                },
            });
        }
    }

    return issueSession(user, deviceId);
};

const rotateRefreshToken = async (refreshToken, deviceId) => {
    let payload;
    try {
        payload = verifyRefreshToken(refreshToken);
    } catch (err) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const { id: userId, jti } = payload;
    const storedJti = await redisClient.get(`refresh:${userId}:${deviceId}`);
    if (!storedJti) {
        throw new ForbiddenError('Session Expired', 'Login AGAIN');
    }
    if (storedJti !== jti) {
        await redisClient.del(`refresh:${userId}:${deviceId}`);
        throw new ForbiddenError('Refresh token reused', 'LOGIN AGAIN');
    }

    const newAccessToken = generateAccessToken(userId);
    const newRefreshToken = generateRefreshToken(userId);
    const { jti: newJti } = jwt.decode(newRefreshToken);
    await redisClient.set(
        `refresh:${userId}:${deviceId}`,
        newJti,
        'EX',
        config.REFRESH_TOKEN_EXP_SEC
    );

    return { newAccessToken, newRefreshToken };
};

const logout = async (userId, deviceId) => {
    await redisClient.del(`refresh:${userId}:${deviceId}`);
    await redisClient.del(`user:${userId}`);
};

module.exports = {
    sendOTP, verifyOTP, login, verifyGoogleIdToken,
    rotateRefreshToken, logout,
};