// /api/search-places.js
// Rota: GET /api/search-places?niche=doceria&city=Recife
// Busca empresas na Google Places API (New) e devolve só as que NÃO têm site cadastrado.

export default async function handler(req, res) {
  // CORS liberado (o app roda em outro domínio)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { niche, city } = req.query;
  if (!niche) {
    return res.status(400).json({ error: 'Informe o parâmetro "niche" (ex: doceria, marcenaria).' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY não configurada nas variáveis de ambiente do servidor.' });
  }

  const textQuery = city ? `${niche} em ${city}` : niche;

  try {
    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // FieldMask controla o que volta na resposta (e o que você paga) —
        // pedimos só o necessário, incluindo websiteUri pra saber quem NÃO tem site.
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.internationalPhoneNumber',
          'places.websiteUri',
          'places.photos',
          'places.location',
          'places.primaryTypeDisplayName',
          'places.rating',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'pt-BR',
        regionCode: 'BR',
      }),
    });

    if (!placesRes.ok) {
      const detail = await placesRes.text();
      return res.status(placesRes.status).json({ error: 'Erro na Google Places API', detail });
    }

    const data = await placesRes.json();
    const places = data.places || [];

    // O filtro principal do app: só quem não tem site.
    const semSite = places
      .filter((p) => !p.websiteUri)
      .map((p) => ({
        placeId: p.id,
        name: p.displayName?.text || 'Sem nome',
        niche: p.primaryTypeDisplayName?.text || niche,
        city: city || '',
        phone: (p.nationalPhoneNumber || p.internationalPhoneNumber || '').replace(/\D/g, ''),
        addr: p.formattedAddress || '',
        rating: p.rating ?? null,
        photoName: p.photos?.[0]?.name || null, // usar em /api/photo?name=...
      }));

    return res.status(200).json({
      totalEncontrado: places.length,
      totalSemSite: semSite.length,
      results: semSite,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao consultar a Places API', detail: String(err) });
  }
      }
