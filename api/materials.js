/* /api/materials — CRUD for materials pricing
   GET  → public
   POST → admin only (replaces full list) */
const { backendReady, verifySession, headers, parseBody } = require('./_lib/auth');
const store = require('./_lib/store');

const STORE_KEY = 'raas_materials';

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
    const materials = await store.get(STORE_KEY);
    return res.writeHead(200, headers()).end(JSON.stringify(materials || []));
  }

  if (req.method === 'POST') {
    if (!verifySession(req)) {
      return res.writeHead(401, headers()).end(JSON.stringify({ error: 'Unauthorized' }));
    }
    const body = await parseBody(req);
    if (!Array.isArray(body)) {
      return res.writeHead(400, headers()).end(JSON.stringify({ error: 'Expected array of materials' }));
    }
    await store.set(STORE_KEY, body);
    return res.writeHead(200, headers()).end(JSON.stringify({ ok: true }));
  }

  res.writeHead(405, headers()).end(JSON.stringify({ error: 'Method not allowed' }));
};
