
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/', authenticate, authorize(['prestataire']), serviceController.createService);
router.get('/', authenticate, authorize(['prestataire']), serviceController.getServices);

module.exports = router;
