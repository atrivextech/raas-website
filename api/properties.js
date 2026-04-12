/* /api/properties — CRUD for properties
   GET  → public (no auth needed)
   POST → requires admin session */
const { backendReady, verifySession, headers, parseBody } = require('./_lib/auth');
const store = require('./_lib/store');

const STORE_KEY = 'raas_properties';

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

  // ── GET: list all properties (public) ──
  if (req.method === 'GET') {
    const properties = (await store.get(STORE_KEY)) || [];
    return res.writeHead(200, headers()).end(JSON.stringify(properties));
  }

  // ── POST: add a property (admin only) ──
  if (req.method === 'POST') {
    if (!verifySession(req)) {
      return res.writeHead(401, headers()).end(JSON.stringify({ error: 'Unauthorized' }));
    }
    const body = await parseBody(req);
    if (!body || !body.name) {
      return res.writeHead(400, headers()).end(JSON.stringify({ error: 'Property name required' }));
    }
    body.id = body.id || Date.now();
    const properties = (await store.get(STORE_KEY)) || [];
    properties.push(body);
    await store.set(STORE_KEY, properties);
    return res.writeHead(201, headers()).end(JSON.stringify({ ok: true, id: body.id }));
  }

  // ── DELETE: remove a property by id (admin only) ──
  if (req.method === 'DELETE') {
    if (!verifySession(req)) {
      return res.writeHead(401, headers()).end(JSON.stringify({ error: 'Unauthorized' }));
    }
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get('id');
    if (!id) {
      return res.writeHead(400, headers()).end(JSON.stringify({ error: 'Property id required' }));
    }
    let properties = (await store.get(STORE_KEY)) || [];
    properties = properties.filter(p => String(p.id) !== String(id));
    await store.set(STORE_KEY, properties);
    return res.writeHead(200, headers()).end(JSON.stringify({ ok: true }));
  }

  res.writeHead(405, headers()).end(JSON.stringify({ error: 'Method not allowed' }));
};
