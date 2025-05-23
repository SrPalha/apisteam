import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configuração da sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Configuração do Passport
const steamStrategy = new SteamStrategy({
  returnURL: `${process.env.BASE_URL}/api/auth/steam/return`,
  realm: `${process.env.BASE_URL}/`,
  apiKey: process.env.STEAM_API_KEY
}, async (identifier, profile, done) => {
  return done(null, profile);
});

passport.use(steamStrategy);

// Serialização do usuário
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Inicialização do Passport
app.use(passport.initialize());
app.use(passport.session());

// Rota de autenticação Steam
app.get('/api/auth/steam', (req, res, next) => {
  passport.authenticate('steam', { failureRedirect: '/' })(req, res, next);
});

// Rota de retorno após autenticação
app.get('/api/auth/steam/return', 
  (req, res, next) => {
    passport.authenticate('steam', { failureRedirect: '/' })(req, res, next);
  },
  async (req, res) => {
    try {
      // Recebe o user_id do Supabase via query param
      const user_id = req.query.user_id;
      if (!user_id) {
        return res.redirect('/profile?error=not_logged');
      }

      // Atualiza o perfil do usuário no Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          steam_id: req.user.id,
          steam_username: req.user.displayName,
          steam_avatar: req.user.photos[2].value,
          steam_linked: true,
          steam_linked_at: new Date().toISOString()
        })
        .eq('id', user_id);

      if (error) {
        console.error('Erro ao atualizar perfil:', error);
        return res.redirect('/profile?error=update_failed');
      }

      // Redireciona de volta para o frontend
      res.redirect('/profile?success=steam_linked');
    } catch (error) {
      console.error('Erro no callback Steam:', error);
      res.redirect('/profile?error=server_error');
    }
  }
);

export default app; 