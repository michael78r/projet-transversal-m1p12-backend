
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, registrationRules } = require('../middlewares/validator');

router.post('/register', registrationRules(), validate, authController.register);
router.post('/login', authController.login);

module.exports = router;
