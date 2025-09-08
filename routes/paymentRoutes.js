
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/auth');

router.post('/initiate', authenticate, paymentController.initiatePayment);
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
