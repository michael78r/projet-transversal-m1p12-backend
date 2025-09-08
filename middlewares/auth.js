
const passport = require('passport');

const authenticate = passport.authenticate('jwt', { session: false });

const authorize = (roles) => (req, res, next) => {
  if (!roles || roles.length === 0) {
    return next();
  }
  
  if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: Insufficient role' });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
};
