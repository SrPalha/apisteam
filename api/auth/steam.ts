import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import passport from 'passport';
import session from 'express-session';
import SteamStrategy from 'passport-steam';
import express from 'express';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(session({ secret: 'steamsecret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new SteamStrategy({
  returnURL: `${process.env.BASE_URL}/api/auth/steam/return`,
  realm: `${process.env.BASE_URL}/`,
  apiKey: process.env.STEAM_API_KEY!
}, (identifier, profile, done) => {
  return done(null, profile);
}));

app.get('/api/auth/steam', passport.authenticate('steam'));

app.get('/api/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/' }), async (req: any, res) => {
  // Recebe o user_id do Supabase via query param
  const user_id = req.query.user_id;
  if (!user_id) return res.redirect('/profile?error=not_logged');
  await supabase
    .from('profiles')
    .update({
      steam_id: req.user.id,
      steam_username: req.user.displayName,
      steam_avatar: req.user.photos[2].value
    })
    .eq('id', user_id);
  res.redirect('/profile');
});

export default (req: VercelRequest, res: VercelResponse) => app(req, res); 