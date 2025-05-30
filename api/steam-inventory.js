const API_KEY = 'XYVYXM7T3TYBY9IN';

export default async function handler(req, res) {
  const { steam_id } = req.query;
  if (!steam_id) return res.status(400).json({ error: 'steam_id is required' });

  const url = `https://www.steamwebapi.com/steam/api/inventory?key=${API_KEY}&steam_id=${steam_id}`;
  const response = await fetch(url);
  if (!response.ok) return res.status(500).json({ error: 'Erro ao buscar inventário SteamWebAPI' });

  const inventory = await response.json();
  return res.status(200).json(inventory);
} 