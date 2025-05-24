let cache = {
  data: null,
  expires: 0
};

export default async function handler(req, res) {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  const now = Date.now();
  // Se o cache está válido, usa ele
  if (cache.data && cache.expires > now) {
    const item = cache.data.find(i => i.market_hash_name === name);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ suggested_price: item.suggested_price });
  }

  // Se não tem cache ou expirou, busca da Skinport
  const url = 'https://api.skinport.com/v1/items?app_id=730&currency=BRL';
  try {
    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'br' }
    });
    if (!response.ok) {
      return res.status(500).json({ error: 'Skinport API error', status: response.status });
    }
    const data = await response.json();
    // Atualiza o cache por 5 minutos
    cache.data = data;
    cache.expires = now + 5 * 60 * 1000;

    const item = data.find(i => i.market_hash_name === name);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ suggested_price: item.suggested_price });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
} 