import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    // Aqui você pode tentar recuperar o user_id de um cookie, header, ou query se possível
    // Como fallback, apenas retorna mensagem de debug
    // O ideal seria usar JWT ou outro método para identificar o usuário
    res.send('Callback Steam recebido! Implemente a lógica de atualização do perfil aqui.');
  } catch (error) {
    res.status(500).send('Erro inesperado no callback Steam.');
  }
} 