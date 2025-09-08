
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize(['admin']));

router.get('/users', adminController.getUsers);
router.put('/users/:id/manage', adminController.manageUser);

module.exports = router;
