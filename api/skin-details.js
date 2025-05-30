const API_KEY = 'XYVYXM7T3TYBY9IN';

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 15000 } = options;
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

module.exports = async function handler(req, res) {
  const { assetid, market_hash_name, inspectlink } = req.query;
  if (!market_hash_name && !inspectlink) {
    return res.status(400).json({ error: 'market_hash_name ou inspectlink é obrigatório.' });
  }
  try {
    // 1. Buscar detalhes do item
    let itemData = {};
    if (market_hash_name) {
      const itemUrl = `https://www.steamwebapi.com/steam/api/item?key=${API_KEY}&market_hash_name=${encodeURIComponent(market_hash_name)}`;
      const itemResp = await fetchWithTimeout(itemUrl, { timeout: 12000 });
      if (itemResp.ok) {
        itemData = await itemResp.json();
      }
    }
    // 2. Buscar float e detalhes técnicos
    let floatInfo = null;
    let paintseed = null;
    let patternindex = null;
    let float = null;
    let condition = null;
    let usedInspectLink = inspectlink || itemData.inspectlink;
    if (usedInspectLink) {
      const floatUrl = `https://www.steamwebapi.com/steam/api/float?key=${API_KEY}&url=${encodeURIComponent(usedInspectLink)}&production=1`;
      const floatResp = await fetchWithTimeout(floatUrl, { timeout: 15000 });
      const floatText = await floatResp.text();
      try {
        const floatJson = JSON.parse(floatText);
        floatInfo = floatJson;
        float = floatJson.floatvalue ?? floatJson.float ?? floatJson.wear ?? null;
        paintseed = floatJson.paintseed ?? null;
        patternindex = floatJson.paintindex ?? null;
        condition = floatJson.exterior || floatJson.wear || null;
      } catch (e) {
        // erro ao parsear float
      }
    }
    // 3. Buscar coleção
    let collection = '';
    if (market_hash_name) {
      const colUrl = `https://www.steamwebapi.com/steam/api/cs/collections?key=${API_KEY}`;
      const colResp = await fetchWithTimeout(colUrl, { timeout: 8000 });
      if (colResp.ok) {
        const colData = await colResp.json();
        if (Array.isArray(colData)) {
          for (const col of colData) {
            if (col.items && col.items.some(i => i.markethashname === market_hash_name)) {
              collection = col.name;
              break;
            }
          }
        }
      }
    }
    // Fallback: tenta pegar coleção do campo tag7 ou dos tags
    if (!collection && itemData.tag7) {
      collection = itemData.tag7;
    }
    if (!collection && Array.isArray(itemData.tags)) {
      const colTag = itemData.tags.find(t => t.category === 'ItemSet' || t.localized_category_name === 'Collection');
      if (colTag) collection = colTag.localized_tag_name || colTag.internal_name;
    }
    // 4. Condição por extenso
    if (!condition) {
      const condTag = itemData.tags && itemData.tags.find(t => t.category === 'Exterior' || t.localized_category_name === 'Exterior');
      if (condTag) condition = condTag.localized_tag_name;
    }
    // 5. Montar resposta
    return res.status(200).json({
      name: itemData.marketname || itemData.name || market_hash_name || '',
      image: itemData.image || '',
      rarity: itemData.rarity || '',
      type: itemData.itemtype || itemData.type || '',
      collection,
      float,
      paintseed,
      patternindex,
      condition,
      floatInfo,
      stickers: itemData.stickers || [],
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro inesperado ao buscar detalhes da skin.' });
  }
}; 