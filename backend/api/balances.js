// GET /api/balances?account_id=xxx
// Returns the latest available balance for one GoCardless account ID.

const { getToken, setCors, GC_BASE } = require('../lib/token');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });

  try {
    const token = await getToken();

    const r = await fetch(`${GC_BASE}/accounts/${account_id}/balances/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const data = await r.json();
    const balances = data.balances || [];

    // Preference order for balance type
    const preferred = ['interimAvailable', 'interimBooked', 'closingBooked', 'expected'];
    let chosen = null;
    for (const type of preferred) {
      chosen = balances.find(b => b.balanceType === type);
      if (chosen) break;
    }
    if (!chosen && balances.length > 0) chosen = balances[0];

    return res.json({
      account_id,
      balance: chosen ? parseFloat(chosen.balanceAmount.amount) : null,
      currency: chosen ? chosen.balanceAmount.currency : 'GBP',
      type: chosen ? chosen.balanceType : null,
      all: balances,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
