import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../data/db.js';
import { signToken } from '../middleware/auth.js';

export const initPassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error('No email from Google'), null);

          // Find existing user or create a new one
          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              name:       profile.displayName || email.split('@')[0],
              email,
              phone:      '',
              password:   `google_${profile.id}`, // not used for Google users
              role:       'user',
              isVerified: true,               // Google accounts are pre-verified
            });
          } else if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
          }

          const token = signToken(user);
          return done(null, { token, user });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
};
