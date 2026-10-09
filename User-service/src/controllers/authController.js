const { BadRequestError, UnauthorizedError } = require('../utils/error');
const asyncHandler = require('../utils/asyncHandler');
const { config } = require('../config');
const authservice = require('../services/authService');
const getDeviceFingerprint = require('../utils/deviceFingerprint'); // adjust path if needed

const cookieBase = () => ({
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
});

exports.sendOTP = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, phoneNumber, password, confirmPassword } = req.body;
    if (!firstName || !lastName || !email || !phoneNumber || !confirmPassword || !password) {
        throw new BadRequestError('All fields are required');
    }
    if (password !== confirmPassword) {
        throw new BadRequestError('Passwords do not match');
    }

    const { otpSessionId } = await authservice.sendOTP(firstName, lastName, email, password);

    res.cookie('otpSessionId', otpSessionId, {
        ...cookieBase(),
        maxAge: (config.OTP_TTL || 300) * 1000,
    })
        .status(200)
        .json({ success: true, message: 'OTP sent successfully' });
});

exports.verifyOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    const otpSessionId = req.cookies?.otpSessionId;

    if (!otp || !otpSessionId) {
        throw new BadRequestError('OTP session not found. Please request a new OTP.');
    }

    const user = await authservice.verifyOTP(otpSessionId, otp);

    res.clearCookie('otpSessionId', cookieBase());

    return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            emailVerified: user.emailVerified,
        },
    });
});

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequestError('Email and password are required');
    }

    const deviceId = getDeviceFingerprint(req);
    const { accessToken, refreshToken, loggedInUser } =
        await authservice.login(email, password, deviceId);

    res.cookie('accessToken', accessToken, {
        ...cookieBase(),
        maxAge: config.ACCESS_TOKEN_EXP_SEC * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
        ...cookieBase(),
        maxAge: config.REFRESH_TOKEN_EXP_SEC * 1000,
    });

    return res.status(200).json({
        success: true,
        message: 'Login successful',
        loggedInUser,
    });
});

exports.refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        throw new UnauthorizedError('Refresh token missing');
    }

    const deviceId = getDeviceFingerprint(req);
    const { newAccessToken, newRefreshToken } =
        await authservice.rotateRefreshToken(refreshToken, deviceId);

    res.cookie('accessToken', newAccessToken, {
        ...cookieBase(),
        maxAge: config.ACCESS_TOKEN_EXP_SEC * 1000,
    });
    res.cookie('refreshToken', newRefreshToken, {
        ...cookieBase(),
        maxAge: config.REFRESH_TOKEN_EXP_SEC * 1000,
    });

    return res.status(200).json({ success: true, message: 'Token refreshed' });
});

exports.logout = asyncHandler(async (req, res) => {
    const deviceId = getDeviceFingerprint(req);
    await authservice.logout(req.user.id, deviceId);

    res.clearCookie('accessToken', cookieBase());
    res.clearCookie('refreshToken', cookieBase());

    return res.status(200).json({ success: true, message: 'Logged out' });
});

exports.verifyGoogleIdToken = asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        throw new BadRequestError('Google ID token is required');
    }

    const deviceId = getDeviceFingerprint(req);
    const { accessToken, refreshToken, loggedInUser } =
        await authservice.verifyGoogleIdToken(idToken, deviceId);

    res.cookie('accessToken', accessToken, {
        ...cookieBase(),
        maxAge: config.ACCESS_TOKEN_EXP_SEC * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
        ...cookieBase(),
        maxAge: config.REFRESH_TOKEN_EXP_SEC * 1000,
    });

    return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        loggedInUser,
    });
});