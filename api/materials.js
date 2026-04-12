/* /api/materials — materials pricing
   GET  → public
   POST → admin (replaces full list) */
const { backendReady, verifySession, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { vercelWrap } = require('./_lib/adapter');

const KEY = 'raas_materials';

async function handle({ method, headers, body }) {
  if (method === 'OPTIONS') return respond(204, '');

  if (!backendReady()) {
    return respond(503, { error: 'Backend not configured', fallback: true });
  }

  if (method === 'GET') {
    const mats = await store.get(KEY);
    return respond(200, mats || []);
  }

  if (method === 'POST') {
    if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });
    if (!Array.isArray(body)) return respond(400, { error: 'Expected array of materials' });
    await store.set(KEY, body);
    return respond(200, { ok: true });
  }

  return respond(405, { error: 'Method not allowed' });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
