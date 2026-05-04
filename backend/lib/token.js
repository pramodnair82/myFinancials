// Fetches a fresh GoCardless access token.
// Tokens last 24h but serverless functions have no persistent memory,
// so we fetch a new one per request (it's fast ~100ms).

const GC_BASE = 'https://bankaccountdata.gocardless.com/api/v2';

async function getToken() {
  const res = await fetch(`${GC_BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret_id: process.env.GOCARDLESS_SECRET_ID,
      secret_key: process.env.GOCARDLESS_SECRET_KEY,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GoCardless auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access;
}

function setCors(res) {
  // Allow your GitHub Pages frontend (and localhost for testing)
  const allowed = [
    'https://pramodnair82.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
  ];
  res.setHeader('Access-Control-Allow-Origin', '*'); // Tighten to allowed list once live
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { getToken, setCors, GC_BASE };
