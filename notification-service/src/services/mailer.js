const nodemailer = require('nodemailer');
const { config } = require('../config');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.MAIL_USER, pass: config.MAIL_PASSWORD },
});

const from = `"${config.APP_NAME}" <${config.MAIL_USER}>`;

const escapeHtml = (s = '') =>
    String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

const wrapper = (inner) => `
<div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 420px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
${inner}
</div>`;

async function sendOtpMail(email, otp, minutes) {
    await transporter.sendMail({
        from,
        to: email,
        subject: `${otp} is your verification code`,
        text: `Your OTP is ${otp}. It is valid for ${minutes} minutes. If you did not request this, please ignore this email.`,
        html: wrapper(`
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="color:#4949fe; margin:0;">Your verification code</h2>
            </div>
            <p style="font-size:16px; color:#333;">
                Use the code below to complete your verification. It is valid for <strong>${minutes} minutes</strong>.
            </p>
            <div style="text-align:center;">
                <div style="display:inline-block; padding:14px 25px; font-size:32px; letter-spacing:8px; font-weight:bold; color:#4949fe; background-color:#f1f1f1; border-radius:8px; margin:20px 0;">
                    ${escapeHtml(otp)}
                </div>
            </div>
            <p style="font-size:15px; color:#555;">If you did not request this code, please ignore this email.</p>
        `),
    });
}

async function sendVerifiedMail(email, firstName) {
    const name = firstName ? ` ${escapeHtml(firstName)}` : '';
    await transporter.sendMail({
        from,
        to: email,
        subject: 'Verification successful',
        text: `Hello${firstName ? ' ' + firstName : ''}, your verification was successful. If this wasn't you, please contact support.`,
        html: wrapper(`
            <h2 style="color:#4949fe; text-align:center; margin:0 0 20px;">Verification Successful</h2>
            <p style="font-size:16px; color:#333;">Hello${name},</p>
            <p style="font-size:16px; color:#333;">Your verification was successful.</p>
            <p style="font-size:15px; color:#555;">If this wasn't you, please contact support.</p>
        `),
    });
}

module.exports = { sendOtpMail, sendVerifiedMail };