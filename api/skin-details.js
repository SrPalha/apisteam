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

// Vercel Serverless Function
module.exports = async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Garantir que é uma requisição GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[skin-details] Início do handler', { query: req.query });
  
  const { id, market_hash_name, inspect_link } = req.query;
  if (!id && !market_hash_name) {
    console.log('[skin-details] Erro: Parâmetros inválidos');
    return res.status(400).json({ error: 'Parâmetro id ou market_hash_name é obrigatório.' });
  }

  // Chave de cache
  const cacheKey = market_hash_name || id;
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].ts < CACHE_TTL)) {
    console.log('[skin-details] Retornando dados do cache');
    return res.status(200).json(cache[cacheKey].data);
  }

  try {
    // 1. Buscar detalhes de mercado
    let itemData = null;
    let mhName = market_hash_name;
    if (!mhName && id) {
      console.log('[skin-details] Erro: market_hash_name não fornecido');
      return res.status(400).json({ error: 'market_hash_name é obrigatório se não houver mapeamento local.' });
    }

    console.log('[skin-details] Buscando detalhes do item:', mhName);
    const itemUrl = `https://www.steamwebapi.com/steam/api/item?key=${API_KEY}&market_hash_name=${encodeURIComponent(mhName)}`;
    const itemResp = await fetchWithTimeout(itemUrl, { timeout: 12000 });
    
    if (!itemResp.ok) {
      console.error('[skin-details] Erro ao buscar item:', itemResp.status);
      return res.status(502).json({ error: 'Erro ao buscar detalhes do item', status: itemResp.status });
    }
    
    itemData = await itemResp.json();
    console.log('[skin-details] Detalhes do item obtidos:', { 
      name: itemData.name,
      inspectlink: itemData.inspectlink,
      rarity: itemData.rarity
    });

    // 2. Buscar float usando inspect_link do parâmetro ou do itemData
    let floatInfo = null;
    const inspectUrl = inspect_link || itemData.inspectlink;
    
    if (inspectUrl) {
      console.log('[skin-details] Buscando float com inspect link:', inspectUrl);
      const floatUrl = `https://www.steamwebapi.com/steam/api/float?key=${API_KEY}&url=${encodeURIComponent(inspectUrl)}`;
      try {
        const floatResp = await fetchWithTimeout(floatUrl, { timeout: 10000 });
        if (floatResp.ok) {
          floatInfo = await floatResp.json();
          console.log('[skin-details] Float info obtida:', floatInfo);
        } else {
          console.error('[skin-details] Erro ao buscar float:', floatResp.status);
        }
      } catch (e) {
        console.error('[skin-details] Erro ao buscar float:', e);
      }
    } else {
      console.log('[skin-details] Nenhum inspect link disponível para buscar float');
    }

    // 3. Buscar histórico de preço
    let priceHistory = null;
    try {
      console.log('[skin-details] Buscando histórico de preço');
      const histUrl = `https://www.steamwebapi.com/steam/api/history?key=${API_KEY}&market_hash_name=${encodeURIComponent(mhName)}`;
      const histResp = await fetchWithTimeout(histUrl, { timeout: 10000 });
      if (histResp.ok) {
        priceHistory = await histResp.json();
        console.log('[skin-details] Histórico de preço obtido');
      }
    } catch (e) {
      console.error('[skin-details] Erro ao buscar histórico:', e);
    }

    // 4. Buscar coleção/case
    let collection = null;
    try {
      console.log('[skin-details] Buscando coleção');
      const colUrl = `https://www.steamwebapi.com/steam/api/cs/collections?key=${API_KEY}`;
      const colResp = await fetchWithTimeout(colUrl, { timeout: 10000 });
      if (colResp.ok) {
        const colData = await colResp.json();
        if (Array.isArray(colData)) {
          for (const col of colData) {
            if (col.items && col.items.some(i => i.markethashname === mhName)) {
              collection = col;
              console.log('[skin-details] Coleção encontrada:', collection.name);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('[skin-details] Erro ao buscar coleção:', e);
    }

    // Montar resposta final
    const enriched = {
      ...itemData,
      floatInfo,
      priceHistory,
      collection
    };
    
    console.log('[skin-details] Resposta final montada:', {
      name: enriched.name,
      hasFloat: !!enriched.floatInfo,
      hasCollection: !!enriched.collection,
      hasPriceHistory: !!enriched.priceHistory
    });
    
    cache[cacheKey] = { ts: now, data: enriched };
    return res.status(200).json(enriched);
  } catch (err) {
    console.error('[skin-details] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar detalhes da skin.' });
  }
}; 