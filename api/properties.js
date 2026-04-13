/* /api/properties — CRUD
   GET    → public
   POST   → admin (add)
   DELETE → admin (remove by ?id=) */
const { backendReady, verifySession, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { vercelWrap } = require('./_lib/adapter');

const KEY = 'raas_properties';

async function handle({ method, headers, url, body }) {
  if (method === 'OPTIONS') return respond(204, '');

  if (!backendReady()) {
    return respond(503, { error: 'Backend not configured', fallback: true });
  }

  // GET — list
  if (method === 'GET') {
    const props = (await store.get(KEY)) || [];
    return respond(200, props);
  }

  // POST — add
  if (method === 'POST') {
    if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });
    if (!body || !body.name) return respond(400, { error: 'Property name required' });
    body.id = body.id || Date.now();
    let props = (await store.get(KEY)) || [];
    const idx = props.findIndex(p => String(p.id) === String(body.id));
    if (idx >= 0) props[idx] = body; else props.push(body);
    await store.set(KEY, props);
    return respond(201, { ok: true, id: body.id });
  }

  // DELETE — remove by id
  if (method === 'DELETE') {
    if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });
    const u = new URL(url, 'http://localhost');
    const id = u.searchParams.get('id');
    if (!id) return respond(400, { error: 'Property id required' });
    let props = (await store.get(KEY)) || [];
    props = props.filter(p => String(p.id) !== String(id));
    await store.set(KEY, props);
    return respond(200, { ok: true });
  }

  return respond(405, { error: 'Method not allowed' });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
