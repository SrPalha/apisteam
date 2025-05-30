export default async function handler(req, res) {
  // Configurar CORS
  const allowedOrigins = [
    'http://localhost:8080',
    'https://cs.eloninja.com.br',
    'https://eloninja.com.br'
  ];
  
  const origin = req.headers.origin;
  const corsHeaders = {
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  };

  // Aplicar headers CORS
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Tratar requisição OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verificar origem
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origem não permitida' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { steamId } = req.query;
  const STEAM_API_KEY = process.env.STEAM_API_KEY;

  if (!STEAM_API_KEY) {
    return res.status(500).json({ error: 'Steam API Key não configurada' });
  }

  try {
    // Primeiro verifica se o perfil existe e está público
    const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const profileRes = await fetch(profileUrl);
    
    if (!profileRes.ok) {
      return res.status(profileRes.status).json({ error: 'Erro ao verificar perfil' });
    }

    const profileData = await profileRes.json();
    if (!profileData.response?.players?.[0]) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    // Tenta primeiro a API oficial
    const inventoryUrl = `https://api.steampowered.com/IEconItems_730/GetPlayerItems/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}`;
    const inventoryRes = await fetch(inventoryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!inventoryRes.ok) {
      // Se falhar, tenta o endpoint do inventário da comunidade
      const communityUrl = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`;
      const communityRes = await fetch(communityUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!communityRes.ok) {
        return res.status(communityRes.status).json({ error: 'Erro ao buscar inventário' });
      }

      const communityData = await communityRes.json();
      return res.json(communityData);
    }

    const inventoryData = await inventoryRes.json();
    return res.json(inventoryData);
  } catch (error) {
    console.error('Erro ao buscar inventário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 
