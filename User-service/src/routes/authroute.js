const express = require('express');
const router = express.Router();
const {sendOTP} = require('../controllers/authController');

router.post("/send-otp", sendOTP);

module.exports = router;
