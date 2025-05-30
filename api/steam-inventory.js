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

    // Enriquecer cada item com detalhes extras
    const enrichedItems = await Promise.all(filtered.map(async (item) => {
      let floatInfo = null;
      let collection = '';
      let itemtype = '';
      let rarity = item.rarity || item.tag6 || '';
      let stickers = Array.isArray(item.stickers)
        ? item.stickers.map(s => ({ name: s.name, image: s.image || s.icon_url || '' }))
        : [];
      let paintseed = null;
      let patternindex = null;
      let marketable = item.marketable ?? 0;
      let tradable = item.tradable ?? 0;
      let image = item.image || item.icon_url || '';
      let price = item.pricelatest ?? item.pricesafe ?? item.pricereal ?? item.price ?? 0;
      let condition = (item.wear || item.condition || item.tag5 || '').replace('FT', 'Field-Tested').replace('MW', 'Minimal Wear').replace('FN', 'Factory New').replace('WW', 'Well-Worn').replace('BS', 'Battle-Scarred');
      // Se vier abreviado, mapear para texto completo
      const conditionMap = {
        'FT': 'Field-Tested',
        'MW': 'Minimal Wear',
        'FN': 'Factory New',
        'WW': 'Well-Worn',
        'BS': 'Battle-Scarred',
        'Field-Tested': 'Field-Tested',
        'Minimal Wear': 'Minimal Wear',
        'Factory New': 'Factory New',
        'Well-Worn': 'Well-Worn',
        'Battle-Scarred': 'Battle-Scarred',
      };
      if (conditionMap[condition]) condition = conditionMap[condition];
      let name = item.marketname || item.name || item.markethashname || '';
      // Pega o inspectlink individual do inventário
      const inventoryInspectLink = item.inspectlink || (item.actions && item.actions[0]?.link);
      let usedInspectLink = inventoryInspectLink;
      try {
        // Buscar detalhes do item
        const itemUrl = `https://www.steamwebapi.com/steam/api/item?key=${API_KEY}&market_hash_name=${encodeURIComponent(name)}`;
        const itemResp = await fetchWithTimeout(itemUrl, { timeout: 10000 });
        if (itemResp.ok) {
          const itemData = await itemResp.json();
          itemtype = itemData.itemtype || itemData.type || itemtype;
          rarity = itemData.rarity || rarity;
          image = itemData.image || image;
          // Se não houver inspectlink individual, tenta do /api/item
          if (!usedInspectLink && itemData.inspectlink) {
            usedInspectLink = itemData.inspectlink;
          }
          // Buscar float se houver inspect link
          if (usedInspectLink) {
            console.log('[steam-inventory] Buscando float para', name, usedInspectLink);
            const floatUrl = `https://www.steamwebapi.com/steam/api/float?key=${API_KEY}&url=${encodeURIComponent(usedInspectLink)}&production=1`;
            const floatResp = await fetchWithTimeout(floatUrl, { timeout: 8000 });
            const floatText = await floatResp.text();
            try {
              const floatJson = JSON.parse(floatText);
              floatInfo = floatJson;
              if (floatInfo && floatInfo.floatvalue !== undefined) {
                console.log('[steam-inventory] Float encontrado para', name, floatInfo.floatvalue);
              } else {
                console.log('[steam-inventory] Float NÃO encontrado para', name, floatText);
              }
            } catch (e) {
              console.log('[steam-inventory] Erro ao parsear resposta do float:', floatText);
            }
          } else {
            console.log('[steam-inventory] Sem inspect link para buscar float de', name);
          }
          // Buscar coleção
          const colUrl = `https://www.steamwebapi.com/steam/api/cs/collections?key=${API_KEY}`;
          const colResp = await fetchWithTimeout(colUrl, { timeout: 8000 });
          if (colResp.ok) {
            const colData = await colResp.json();
            if (Array.isArray(colData)) {
              for (const col of colData) {
                if (col.items && col.items.some(i => i.markethashname === name)) {
                  collection = col.name;
                  break;
                }
              }
            }
          }
          // Fallback: tenta pegar coleção do campo tag7 ou dos tags
          if (!collection && item.tag7) {
            collection = item.tag7;
          }
          if (!collection && Array.isArray(item.tags)) {
            const colTag = item.tags.find(t => t.category === 'ItemSet' || t.localized_category_name === 'Collection');
            if (colTag) collection = colTag.localized_tag_name || colTag.internal_name;
          }
        }
      } catch (e) {
        console.log('[steam-inventory] Erro ao enriquecer item:', name, e);
      }
      return {
        id: item.assetid || item.id,
        name,
        image,
        price,
        float: (floatInfo?.floatvalue ?? floatInfo?.float ?? floatInfo?.wear ?? item.float ?? null),
        paintseed,
        patternindex,
        condition,
        rarity,
        stickers,
        type: itemtype || item.itemgroup || item.type || '',
        collection,
        marketable,
        tradable,
        listedAt: item.time || null,
        priceChange: item.priceChange ?? null,
      };
    }));

    if (enrichedItems.length > 0) {
      console.log('[steam-inventory] Exemplo de item enriquecido:', enrichedItems[0]);
    }

    console.log(`[steam-inventory] Inventário processado: ${enrichedItems.length} skins`);
    return res.status(200).json({ items: enrichedItems });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[steam-inventory] Timeout na requisição para SteamWebAPI');
      return res.status(504).json({ error: 'Timeout ao buscar inventário na SteamWebAPI' });
    }
    console.error('[steam-inventory] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar inventário.' });
  }
} 