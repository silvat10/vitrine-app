// /api/photo.js
// Rota: GET /api/photo?name=places/XXX/photos/YYY&maxWidth=400
// Repassa a imagem da Places API sem expor a API key no navegador.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { name, maxWidth = 400 } = req.query;
  if (!name) return res.status(400).send('Parâmetro "name" ausente.');

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return res.status(500).send('GOOGLE_PLACES_API_KEY não configurada.');

  try {
    const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
    const imgRes = await fetch(url);
    if (!imgRes.ok) return res.status(imgRes.status).send('Erro ao buscar a foto.');

    res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(500).send('Falha ao buscar a foto: ' + String(err));
  }
      }
