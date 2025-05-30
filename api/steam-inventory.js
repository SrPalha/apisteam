const API_KEY = 'XYVYXM7T3TYBY9IN';

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  const { steam_id } = req.query;
  if (!steam_id) return res.status(400).json({ error: 'steam_id is required' });

  const url = `https://www.steamwebapi.com/steam/api/inventory?key=${API_KEY}&steam_id=${steam_id}`;
  const response = await fetch(url);
  if (!response.ok) return res.status(500).json({ error: 'Erro ao buscar inventário SteamWebAPI' });

  const inventory = await response.json();
  return res.status(200).json(inventory);
} 