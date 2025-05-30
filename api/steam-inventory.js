const CSFLOAT_API_KEY = 'aOO_QnoGm2S2E20BsKYf0CVfs4jQLgGi';

// Função para encontrar a melhor correspondência entre o item Steam e as listagens do CSFloat
function findBestMatch(steamItem, csfloatResults) {
  if (!csfloatResults || csfloatResults.length === 0) return null;
  // Tenta encontrar correspondência exata por paint_seed e paint_index
  const exact = csfloatResults.find(listing =>
    listing.item &&
    listing.item.paint_seed === steamItem.paint_seed &&
    listing.item.paint_index === steamItem.paint_index
  );
  if (exact) return exact;
  // Se não achar, tenta por paint_index apenas
  const byPaintIndex = csfloatResults.find(listing =>
    listing.item && listing.item.paint_index === steamItem.paint_index
  );
  if (byPaintIndex) return byPaintIndex;
  // Se não achar, retorna o primeiro
  return csfloatResults[0];
}

export default async function handler(req, res) {
  const { steam_id } = req.query;
  if (!steam_id) return res.status(400).json({ error: 'steam_id is required' });

  // 1. Buscar inventário Steam
  const inventoryUrl = `https://steamcommunity.com/inventory/${steam_id}/730/2`;
  const response = await fetch(inventoryUrl);
  if (!response.ok) return res.status(500).json({ error: 'Erro ao buscar inventário Steam' });
  const inventory = await response.json();

  // 2. Enriquecer com CSFloat (limite de 10 para evitar rate limit)
  const enrichedItems = await Promise.all(
    (inventory.descriptions || []).slice(0, 10).map(async (item) => {
      let csfloat = null;
      try {
        const floatRes = await fetch(
          `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(item.market_hash_name)}`,
          { headers: { Authorization: CSFLOAT_API_KEY } }
        );
        if (floatRes.ok) {
          const floatData = await floatRes.json();
          // Busca a melhor correspondência
          if (floatData && floatData.data && floatData.data.length > 0) {
            csfloat = findBestMatch(item, floatData.data);
          }
        }
      } catch (e) {
        csfloat = null;
      }
      return {
        ...item,
        csfloat
      };
    })
  );

  // 3. Retorna inventário enriquecido
  res.status(200).json({
    ...inventory,
    descriptions: enrichedItems
  });
} 