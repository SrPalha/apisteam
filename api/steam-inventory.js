const API_KEY = 'XYVYXM7T3TYBY9IN';

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export default async function handler(req, res) {
  const { steam_id } = req.query;

  console.log('[steam-inventory] Início handler', { steam_id });

  if (!steam_id || typeof steam_id !== 'string') {
    console.log('[steam-inventory] steam_id ausente ou inválido');
    return res.status(400).json({ error: 'Parâmetro steam_id é obrigatório.' });
  }

  const url = `https://www.steamwebapi.com/steam/api/inventory?key=${API_KEY}&steam_id=${steam_id}`;
  console.log('[steam-inventory] URL chamada:', url);

  try {
    const response = await fetchWithTimeout(url, { timeout: 12000 });
    if (!response.ok) {
      console.log('[steam-inventory] Erro HTTP', response.status, response.statusText);
      return res.status(502).json({ error: 'Erro ao buscar inventário na SteamWebAPI', status: response.status });
    }

    const inventory = await response.json();

    // Validação básica do retorno
    if (!Array.isArray(inventory) || inventory.length === 0) {
      console.log('[steam-inventory] Inventário vazio ou formato inesperado');
      return res.status(200).json({ items: [], message: 'Inventário vazio ou não encontrado.' });
    }

    // Opcional: filtrar apenas skins (exemplo: type === 'skin' ou weapon)
    const filtered = inventory.filter(item =>
      item.type?.toLowerCase().includes('skin') ||
      item.type?.toLowerCase().includes('rifle') ||
      item.type?.toLowerCase().includes('pistol') ||
      item.type?.toLowerCase().includes('knife') ||
      item.type?.toLowerCase().includes('smg') ||
      item.type?.toLowerCase().includes('shotgun') ||
      item.type?.toLowerCase().includes('sniper') ||
      item.type?.toLowerCase().includes('glove')
    );

    // Padronizar resposta para o frontend
    const items = filtered.map(item => ({
      id: item.assetid || item.id,
      name: item.marketname || item.name || item.market_hash_name,
      image: item.image || item.icon_url || (item.icon_url ? `https://steamcommunity-a.akamaihd.net/economy/image/${item.icon_url}` : ''),
      price: item.price || item.pricelatest || 0,
      float: item.float,
      rarity: item.rarity,
      condition: item.exterior || item.condition,
      stickers: item.stickers || [],
      type: item.type,
      collection: item.collection,
      marketable: item.marketable,
      tradable: item.tradable,
      time: item.time, // se vier do backend
      priceChange: item.priceChange, // se vier do backend
    }));

    console.log(`[steam-inventory] Inventário processado: ${items.length} skins`);
    return res.status(200).json({ items });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[steam-inventory] Timeout na requisição para SteamWebAPI');
      return res.status(504).json({ error: 'Timeout ao buscar inventário na SteamWebAPI' });
    }
    console.error('[steam-inventory] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar inventário.' });
  }
} 