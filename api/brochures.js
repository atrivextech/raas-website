/* /api/brochures — marketing documents (brochures, layouts, price lists)
   GET    → public (list)
   POST   → admin (add metadata: { title, category, url, pathname, type })
   DELETE → admin (remove by ?id=, also deletes the blob) */
const { backendReady, verifySession, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { deleteBlob } = require('./_lib/blob');
const { vercelWrap } = require('./_lib/adapter');

const KEY = 'raas_brochures';

async function handle({ method, headers, url, body }) {
  if (method === 'OPTIONS') return respond(204, '');
  if (!backendReady()) return respond(503, { error: 'Backend not configured', fallback: true });

  if (method === 'GET') {
    const items = (await store.get(KEY)) || [];
    return respond(200, items);
  }

  if (method === 'POST') {
    if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });
    if (!body || !body.title || !body.url) {
      return respond(400, { error: 'title and url are required' });
    }
    const items = (await store.get(KEY)) || [];
    const item = {
      id: body.id || Date.now(),
      title: String(body.title).slice(0, 120),
      category: String(body.category || 'General').slice(0, 60),
      url: body.url,
      pathname: body.pathname || '',
      type: body.type || '',
      createdAt: new Date().toISOString()
    };
    const idx = items.findIndex(i => String(i.id) === String(item.id));
    if (idx >= 0) items[idx] = item; else items.push(item);
    await store.set(KEY, items);
    return respond(201, { ok: true, id: item.id });
  }

  if (method === 'DELETE') {
    if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });
    const u = new URL(url, 'http://localhost');
    const id = u.searchParams.get('id');
    if (!id) return respond(400, { error: 'id required' });
    let items = (await store.get(KEY)) || [];
    const target = items.find(i => String(i.id) === String(id));
    items = items.filter(i => String(i.id) !== String(id));
    await store.set(KEY, items);
    if (target && target.url) deleteBlob(target.url).catch(() => {});
    return respond(200, { ok: true });
  }

  return respond(405, { error: 'Method not allowed' });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
