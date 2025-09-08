
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/', authenticate, authorize(['client']), reviewController.createReview);
router.get('/:prestataireId', reviewController.getReviews);

module.exports = router;
