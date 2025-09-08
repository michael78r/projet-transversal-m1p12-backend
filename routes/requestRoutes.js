
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/', authenticate, authorize(['client']), requestController.createRequest);
router.get('/', authenticate, requestController.getRequests);

module.exports = router;
