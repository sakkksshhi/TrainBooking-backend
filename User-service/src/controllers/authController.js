const { BadRequestError } = require('../utils/error');
const asyncHandler = require('../utils/asyncHandler');
const { config } = require('../config');
const authService = require('../services/authService');


exports.sendOTP = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, phoneNumber , password, confirmPassword } = req.body;
    if (!firstName || !lastName || !email || !phoneNumber || !confirmPassword) {
        throw new BadRequestError('All fields are required');
    }

    if (password !== confirmPassword) {
        throw new BadRequestError('Passwords do not match');
    }

    const {otpSessionId} = await authService.sendOTP(firstName, lastName, email, password );
    res.cookie('otpSessionId', otpSessionId, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'strict', maxAge: config.OTP_TTL * 1000 
    }).status(200).json({ success: true, message: 'OTP sent successfully' }); // 5 minutes
})