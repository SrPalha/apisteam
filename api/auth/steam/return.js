import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    // Recupera o user_id da query string
    const user_id = req.query.user_id;
    // Recupera o steamId do OpenID
    const steamId = req.query['openid.claimed_id']?.split('/').pop();

    if (!user_id || !steamId) {
      return res.redirect('https://cs.eloninja.com.br/profile?error=steam_callback');
    }

    // Atualiza o perfil do usuário no Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        steam_id: steamId,
        steam_linked: true,
        steam_linked_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (error) {
      return res.redirect('https://cs.eloninja.com.br/profile?error=steam_update');
    }

    // Redireciona para o frontend com sucesso
    res.redirect('https://cs.eloninja.com.br/profile?success=steam_linked');
  } catch (error) {
    res.redirect('https://cs.eloninja.com.br/profile?error=steam_server');
  }
} 