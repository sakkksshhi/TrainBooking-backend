const express = require('express');
const router = express.Router();
const {
    sendOTP,
    verifyOTP,
    login,
    refresh,
    logout,
    verifyGoogleIdToken,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth.middleware');

// Public
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/google', verifyGoogleIdToken);

// Protected
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, (req, res) =>
    res.status(200).json({ success: true, data: req.user })
);

module.exports = router;