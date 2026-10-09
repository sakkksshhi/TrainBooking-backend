require('dotenv').config();
const nodemailer = require('nodemailer');
const { config } = require('../config');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.MAIL_USER,
        pass: config.MAIL_PASSWORD
    }
});

const minutes = Math.ceil((config.OTP_TTL || 300) / 60);

async function sendOtpEmail(email, otp) {
    const msg = {
        to: email,
        from: config.MAIL_USER,
        subject: 'Your OTP for IRCTC',
        text: `Your OTP is ${otp}. It is valid for ${minutes} minutes. If you did not request this, please ignore this email.`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 420px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">

            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4949fe; margin: 0;">Your OTP for IRCTC</h2>
            </div>

            <p style="font-size: 16px; color: #333;">Hello,</p>

            <p style="font-size: 16px; color: #333;">
                Welcome to IRCTC! Use the One-Time Password (OTP) below to complete your verification.
                It is valid for <strong>${minutes} minutes</strong>.
            </p>

            <div style="text-align: center;">
                <div style="display: inline-block; padding: 14px 25px; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #4949fe; background-color: #f1f1f1; border-radius: 8px; margin: 20px 0;">
                    ${otp}
                </div>
            </div>

            <p style="font-size: 15px; color: #555;">
                If you did not request this OTP, please ignore this email.
            </p>
        </div>
        `,
    };

    try {
        await transporter.sendMail(msg);
    } catch (err) {
    console.error('Nodemailer error:', err.code, err.message);
    throw new Error('Failed to send OTP email');
}
}

async function verifyOtpEmail(meta) {
    const name = meta.firstname ? ` ${meta.firstname}` : '';

    const msg = {
        to: meta.email,
        from: config.MAIL_USER,
        subject: 'Your OTP has been verified',
        text: `Hello${name}, your OTP has been verified successfully. If this wasn't you, please contact support immediately.`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 420px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">

            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4949fe; margin: 0;">Verification Successful</h2>
            </div>

            <p style="font-size: 16px; color: #333;">Hello${name},</p>

            <p style="font-size: 16px; color: #333;">
                Your OTP has been verified successfully. You can now continue using IRCTC.
            </p>

            <p style="font-size: 15px; color: #555;">
                If you did not perform this verification, please contact support immediately.
            </p>
        </div>
        `,
    };

    try {
        await transporter.sendMail(msg);
    } catch (err) {
    console.error('Nodemailer error:', err.code, err.message);
    throw new Error('Failed to send verification email');
}
}

module.exports = { sendOtpEmail, verifyOtpEmail };
