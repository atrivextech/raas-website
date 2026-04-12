/* /api/settings — site settings (contact info, stats, about)
   GET  → public
   POST → admin only */
const { backendReady, verifySession, headers, parseBody } = require('./_lib/auth');
const store = require('./_lib/store');

const STORE_KEY = 'raas_site_settings';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers());
    return res.end();
  }

  if (!backendReady()) {
    return res.writeHead(503, headers()).end(JSON.stringify({
      error: 'Backend not configured',
      fallback: true
    }));
  }

  if (req.method === 'GET') {
    const settings = await store.get(STORE_KEY);
    return res.writeHead(200, headers()).end(JSON.stringify(settings || {}));
  }

  if (req.method === 'POST') {
    if (!verifySession(req)) {
      return res.writeHead(401, headers()).end(JSON.stringify({ error: 'Unauthorized' }));
    }
    const body = await parseBody(req);
    if (!body || typeof body !== 'object') {
      return res.writeHead(400, headers()).end(JSON.stringify({ error: 'Expected settings object' }));
    }
    await store.set(STORE_KEY, body);
    return res.writeHead(200, headers()).end(JSON.stringify({ ok: true }));
  }

  res.writeHead(405, headers()).end(JSON.stringify({ error: 'Method not allowed' }));
};
