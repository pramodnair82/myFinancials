// POST /api/connect
// Body: { institution_id: "MONZO_MONZGB2L", redirect_url: "https://..." }
// Returns: { requisition_id, link }   ← user opens 'link' to consent at their bank

const { getToken, setCors, GC_BASE } = require('../lib/token');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { institution_id, redirect_url } = req.body || {};

  if (!institution_id || !redirect_url) {
    return res.status(400).json({ error: 'institution_id and redirect_url are required' });
  }

  try {
    const token = await getToken();

    // Unique reference so we can match this requisition later
    const reference = `financeos_${Date.now()}`;

    const r = await fetch(`${GC_BASE}/requisitions/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        redirect: redirect_url,
        institution_id,
        reference,
        user_language: 'EN',
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const data = await r.json();

    return res.json({
      requisition_id: data.id,
      link: data.link,           // ← Send user here to consent
      reference,
      institution_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
