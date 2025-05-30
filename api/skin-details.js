const API_KEY = 'XYVYXM7T3TYBY9IN';
const CACHE_TTL = 60 * 60 * 1000; // 1 hora
const cache = {};

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
  const { id, market_hash_name, inspect_link } = req.query;
  if (!id && !market_hash_name) {
    return res.status(400).json({ error: 'Parâmetro id ou market_hash_name é obrigatório.' });
  }

  // Chave de cache
  const cacheKey = market_hash_name || id;
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].ts < CACHE_TTL)) {
    return res.status(200).json(cache[cacheKey].data);
  }

  try {
    // 1. Buscar detalhes de mercado
    let itemData = null;
    let mhName = market_hash_name;
    if (!mhName && id) {
      // Buscar inventário para mapear assetid -> market_hash_name
      // (Opcional: pode ser melhorado para buscar do banco/local)
      // Aqui, só retorna erro se não tiver market_hash_name
      return res.status(400).json({ error: 'market_hash_name é obrigatório se não houver mapeamento local.' });
    }
    const itemUrl = `https://www.steamwebapi.com/steam/api/item?key=${API_KEY}&market_hash_name=${encodeURIComponent(mhName)}`;
    const itemResp = await fetchWithTimeout(itemUrl, { timeout: 12000 });
    if (!itemResp.ok) {
      return res.status(502).json({ error: 'Erro ao buscar detalhes do item', status: itemResp.status });
    }
    itemData = await itemResp.json();

    // 2. Buscar float usando inspect_link do parâmetro ou do itemData
    let floatInfo = null;
    const inspectUrl = inspect_link || itemData.inspectlink;
    if (inspectUrl) {
      const floatUrl = `https://www.steamwebapi.com/steam/api/float?key=${API_KEY}&url=${encodeURIComponent(inspectUrl)}`;
      try {
        const floatResp = await fetchWithTimeout(floatUrl, { timeout: 10000 });
        if (floatResp.ok) {
          floatInfo = await floatResp.json();
          console.log('Float info obtida:', floatInfo); // Debug
        }
      } catch (e) {
        console.error('Erro ao buscar float:', e); // Debug
      }
    }

    // 3. Buscar histórico de preço (opcional)
    let priceHistory = null;
    try {
      const histUrl = `https://www.steamwebapi.com/steam/api/history?key=${API_KEY}&market_hash_name=${encodeURIComponent(mhName)}`;
      const histResp = await fetchWithTimeout(histUrl, { timeout: 10000 });
      if (histResp.ok) {
        priceHistory = await histResp.json();
      }
    } catch (e) {}

    // 4. Buscar coleção/case (opcional)
    let collection = null;
    try {
      const colUrl = `https://www.steamwebapi.com/steam/api/cs/collections?key=${API_KEY}`;
      const colResp = await fetchWithTimeout(colUrl, { timeout: 10000 });
      if (colResp.ok) {
        const colData = await colResp.json();
        // Tenta encontrar a coleção pela market_hash_name
        if (Array.isArray(colData)) {
          for (const col of colData) {
            if (col.items && col.items.some(i => i.markethashname === mhName)) {
              collection = col;
              break;
            }
          }
        }
      }
    } catch (e) {}

    // Montar resposta final
    const enriched = {
      ...itemData,
      floatInfo,
      priceHistory,
      collection
    };
    cache[cacheKey] = { ts: now, data: enriched };
    return res.status(200).json(enriched);
  } catch (err) {
    console.error('Erro ao processar skin:', err); // Debug
    return res.status(500).json({ error: 'Erro inesperado ao buscar detalhes da skin.' });
  }
} 