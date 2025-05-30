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

    // Filtrar apenas armas (rifle, pistol, knife, smg, shotgun, sniper, glove)
    const filtered = inventory.filter(item =>
      ['rifle', 'pistol', 'knife', 'smg', 'shotgun', 'sniper', 'glove'].includes(
        (item.itemgroup || '').toLowerCase()
      )
    );

    // Padronizar resposta para o frontend
    const items = filtered.map(item => ({
      id: item.assetid || item.id,
      name: item.marketname || item.name || item.markethashname || '',
      image: item.image || item.icon_url || '',
      price: item.pricelatest ?? item.pricesafe ?? item.pricereal ?? item.price ?? 0,
      float: item.float ?? null,
      condition: (item.wear || item.condition || item.tag5 || '').replace('Field-Tested', 'FT').replace('Minimal Wear', 'MW').replace('Factory New', 'FN').replace('Well-Worn', 'WW').replace('Battle-Scarred', 'BS'),
      rarity: item.rarity || item.tag6 || '',
      stickers: Array.isArray(item.stickers)
        ? item.stickers.map(s => ({ name: s.name, image: s.image || s.icon_url || '' }))
        : [],
      type: item.itemgroup || item.type || '',
      collection: item.collection || '',
      marketable: item.marketable ?? 0,
      tradable: item.tradable ?? 0,
      listedAt: item.time || null,
      priceChange: item.priceChange ?? null,
    }));

    if (items.length > 0) {
      console.log('[steam-inventory] Exemplo de item retornado:', items[0]);
    }

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