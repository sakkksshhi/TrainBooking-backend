const ConflictError = require('../utils/error');
const {generateAndStoreOtp} = require('../utils/otp');
const { sendOtpEmail } = require('../utils/email');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const sendOTP = async(firstName, lastName, email, password) => {
    const existingUser = await prisma.user.findUnique({ 
        where: { email } 
    });
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const meta = { firstName, lastName, email, hashedPassword };
    const {otp, otpSessionId} = await generateAndStoreOtp(meta);
    await sendOtpEmail(email , otp);
    return {otpSessionId};

}

module.exports = { sendOTP };