
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { getDB } = require('./db');
const { ObjectId } = require('mongodb');
const { jwtSecret } = require('./index');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
};

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const db = getDB();
        const user = await db.collection('users').findOne({ _id: new ObjectId(jwt_payload.id) });
        
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );
};
