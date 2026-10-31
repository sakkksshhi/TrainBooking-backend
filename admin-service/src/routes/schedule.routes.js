const express = require('express');
const { createSchedule, cancelSchedule, getAllSchedules } = require('../controllers/scheduleController');
const { getUserContext } = require('../middlewares/getUserContext.middleware');

const router = express.Router();

router.post("/schedule", getUserContext, createSchedule);
router.put('/schedule/:scheduleId', getUserContext, cancelSchedule);
router.get('/schedule', getUserContext, getAllSchedules);
module.exports = router;