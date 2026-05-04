// GET /api/institutions
// Returns a list of UK banks/building societies available via GoCardless.

const { getToken, setCors, GC_BASE } = require('../lib/token');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = await getToken();

    const r = await fetch(`${GC_BASE}/institutions/?country=gb`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const institutions = await r.json();

    // Return id, name, logo so frontend can render a picker
    const clean = institutions.map(i => ({
      id: i.id,
      name: i.name,
      logo: i.logo,
      bic: i.bic,
    }));

    return res.json(clean);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
