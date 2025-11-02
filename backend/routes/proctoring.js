const express = require('express');
const { 
    uploadScreenshot, 
    getProctoringData, 
    getExamProctoringData,
    addViolation,
    endProctoringSession
} = require('../controllers/proctoringController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Proctoring routes
router.post('/screenshot', protect, uploadScreenshot);
router.get('/data/:examId/:userId', protect, getProctoringData);
router.get('/exam/:examId', protect, getExamProctoringData);
router.post('/violation', protect, addViolation);
router.post('/end-session', protect, endProctoringSession);

module.exports = router; 