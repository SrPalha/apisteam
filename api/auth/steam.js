import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Verificação das variáveis de ambiente
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'STEAM_API_KEY',
  'BASE_URL',
  'SESSION_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variável de ambiente ${envVar} não está definida`);
  }
}

// Configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configuração da sessão
app.use(session({
  secret: process.env.SESSION_SECRET,
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
  const { user_id } = req.query;
  passport.authenticate('steam', {
    failureRedirect: '/',
    state: user_id // Passa o user_id como state
  })(req, res, next);
});

// Rota de retorno após autenticação
app.get('/api/auth/steam/return', 
  (req, res, next) => {
    passport.authenticate('steam', { failureRedirect: '/' })(req, res, next);
  },
  async (req, res) => {
    try {
      // Recupera o user_id do parâmetro state
      const user_id = req.query.state;
      if (!user_id) {
        return res.redirect('https://cs.eloninja.com.br/profile?error=not_logged');
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
        return res.redirect('https://cs.eloninja.com.br/profile?error=update_failed');
      }

      // Redireciona de volta para o frontend
      res.redirect('https://cs.eloninja.com.br/profile?success=steam_linked');
    } catch (error) {
      console.error('Erro no callback Steam:', error);
      res.redirect('https://cs.eloninja.com.br/profile?error=server_error');
    }
  }
);

// Middleware para rotas não reconhecidas (proteção extra)
app.use((req, res) => {
  res.status(403).send(`
    <html style="background: #0C0E12; color: #fff; font-family: sans-serif;">
      <head>
        <title>Acesso restrito | EloNinja</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="background: linear-gradient(135deg, #0C0E12 60%, #2F99CA 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="display: flex; flex-direction: row; gap: 32px; align-items: center; background: rgba(255,255,255,0.07); border-radius: 24px; box-shadow: 0 8px 32px #0003; padding: 32px 24px; border: 2px solid #2F99CA55;">
          <img src="https://cs.eloninja.com.br/mascote-lupa.png" alt="Mascote Ninja com Lupa" style="width: 120px; height: 120px; border-radius: 16px; box-shadow: 0 2px 8px #0005; background: #fff2;" />
          <div style="text-align: center; max-width: 320px;">
            <h1 style="font-size: 2rem; font-weight: bold; color: #fff; margin-bottom: 12px;">🚫 Acesso restrito!</h1>
            <p style="font-size: 1.1rem; color: #9DA3AE; margin-bottom: 8px;">
              Nossos ninjas estão de olho 👀<br />
              Só quem faz parte do time <span style="color: #80C020; font-weight: bold;">EloNinja</span> pode passar daqui.<br />
              Se você chegou até aqui por engano, volte para a área segura do site!
            </p>
          </div>
          <img src="https://cs.eloninja.com.br/mascote-braco.png" alt="Mascote Ninja de Braços Cruzados" style="width: 120px; height: 120px; border-radius: 16px; box-shadow: 0 2px 8px #0005; background: #fff2;" />
        </div>
        <p style="margin-top: 32px; color: #2F99CA; font-weight: 600;">Protegido por Ninja Security™</p>
      </body>
    </html>
  `);
});

export default app; 