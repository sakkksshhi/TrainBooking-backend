const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { internalOnly } = require('../middleware/internal.middleware');
const {
    getProfile,
    updateProfile,
    deleteProfile,
    getUserInternal,
} = require('../controllers/userController');

// Logged-in users
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.delete('/profile', authenticate, deleteProfile);

// Service-to-service only
router.get('/internal/:userId', internalOnly, getUserInternal);

module.exports = router;