const { BadRequestError } = require('../utils/error');
const { generateAndStoreOtp, verifyAndRetrieveOtp } = require('../utils/otp');
const { sendOtpEmail, verifyOtpEmail } = require('../utils/email');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const sendOTP = async (firstname, lastname, rawEmail, password) => {
    const email = rawEmail.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });
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
            }
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

module.exports = { sendOTP, verifyOTP };