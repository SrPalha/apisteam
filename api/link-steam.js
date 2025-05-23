import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: Nunca exponha a Service Role Key no frontend!
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service Role Key para permissões administrativas
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://cs.eloninja.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { user_id, steam_id } = req.body;

  if (!user_id || !steam_id) return res.status(400).send('Missing user_id or steam_id');

  try {
    const apiKey = process.env.STEAM_API_KEY;
    const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steam_id}`;
    const response = await fetch(steamApiUrl);
    const data = await response.json();
    const player = data.response.players[0];

    const { error } = await supabase
      .from('profiles')
      .update({
        steam_id,
        steam_username: player?.personaname || null,
        steam_avatar: player?.avatarfull || null,
        steam_linked: true,
        steam_linked_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (error) return res.status(500).send('Erro ao atualizar perfil no Supabase.');

    res.status(200).send('Conta Steam vinculada com sucesso!');
  } catch (err) {
    res.status(500).send('Erro inesperado ao vincular Steam.');
  }
} 