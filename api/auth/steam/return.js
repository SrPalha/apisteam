import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    // Extrai o steamId do OpenID
    const steamId = req.query['openid.claimed_id']?.split('/').pop();

    if (!steamId) {
      return res.redirect('https://cs.eloninja.com.br/profile?error=steam_callback');
    }

    // Redireciona para o frontend com steam_id na query
    res.redirect(`https://cs.eloninja.com.br/profile?steam_id=${steamId}`);
  } catch (error) {
    res.redirect('https://cs.eloninja.com.br/profile?error=steam_server');
  }
} 