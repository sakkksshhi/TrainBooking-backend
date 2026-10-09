const { BadRequestError } = require('../utils/error');
const asyncHandler = require('../utils/asyncHandler');
const { config } = require('../config');
const authservice = require('../services/authService');


exports.sendOTP = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, phoneNumber , password, confirmPassword } = req.body;
    if (!firstName || !lastName || !email || !phoneNumber || !confirmPassword || !password) {
        throw new BadRequestError('All fields are required');
    }

    if (password !== confirmPassword) {
        throw new BadRequestError('Passwords do not match');
    }

    const {otpSessionId} = await authservice.sendOTP(firstName, lastName, email, password );
    res.cookie('otpSessionId', otpSessionId, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'strict', maxAge: (config.OTP_TTL || 300) * 1000 
    }).status(200).json({ success: true, message: 'OTP sent successfully' }); 
    // 5 minutes

})

exports.verifyOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    const otpSessionId = req.cookies?.otpSessionId;

    if (!otp || !otpSessionId) {
        throw new BadRequestError(
            'OTP session not found. Please request a new OTP.'
        );
    }

    const user = await authservice.verifyOTP(otpSessionId, otp);

    res.clearCookie('otpSessionId', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    });

    return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            emailVerified: user.emailVerified
        }
    });
});