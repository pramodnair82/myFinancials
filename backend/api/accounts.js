// GET /api/accounts?requisition_id=xxx
// Returns accounts linked to this requisition (after user has consented at bank).
// Each account has: id, iban, name, currency, institution_id

const { getToken, setCors, GC_BASE } = require('../lib/token');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { requisition_id } = req.query;
  if (!requisition_id) return res.status(400).json({ error: 'requisition_id required' });

  try {
    const token = await getToken();

    // Get the requisition to find account IDs
    const rReq = await fetch(`${GC_BASE}/requisitions/${requisition_id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!rReq.ok) {
      const err = await rReq.text();
      return res.status(rReq.status).json({ error: err });
    }

    const reqData = await rReq.json();

    if (!reqData.accounts || reqData.accounts.length === 0) {
      // Consent not yet given, or timed out
      return res.json({
        status: reqData.status,
        accounts: [],
        message: reqData.status === 'CR' ? 'Awaiting user consent' : 'No accounts found',
      });
    }

    // Fetch details for each account in parallel
    const accountDetails = await Promise.all(
      reqData.accounts.map(async (accountId) => {
        try {
          const [detailRes, balRes] = await Promise.all([
            fetch(`${GC_BASE}/accounts/${accountId}/details/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${GC_BASE}/accounts/${accountId}/balances/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const detailData = detailRes.ok ? await detailRes.json() : {};
          const balData = balRes.ok ? await balRes.json() : {};

          const detail = detailData.account || {};

          // Pick the best available balance type
          const balances = balData.balances || [];
          const preferred = ['interimAvailable', 'interimBooked', 'closingBooked', 'expected'];
          let balance = null;
          for (const type of preferred) {
            const found = balances.find(b => b.balanceType === type);
            if (found) { balance = found.balanceAmount; break; }
          }
          if (!balance && balances.length > 0) {
            balance = balances[0].balanceAmount;
          }

          return {
            id: accountId,
            iban: detail.iban || '',
            name: detail.name || detail.product || 'Account',
            currency: detail.currency || (balance ? balance.currency : 'GBP'),
            balance: balance ? parseFloat(balance.amount) : null,
            requisition_id,
            institution_id: reqData.institution_id,
          };
        } catch {
          return { id: accountId, name: 'Account', balance: null, error: true };
        }
      })
    );

    return res.json({ status: reqData.status, accounts: accountDetails });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
