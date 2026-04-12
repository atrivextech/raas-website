/* /api/settings — site settings
   GET  → public
   POST → admin */
const { backendReady, verifySession, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { vercelWrap } = require('./_lib/adapter');

const KEY = 'raas_site_settings';

async function handle({ method, headers, body }) {
  if (method === 'OPTIONS') return respond(204, '');

  if (!backendReady()) {
    return respond(503, { error: 'Backend not configured', fallback: true });
  }

  if (method === 'GET') {
    const s = await store.get(KEY);
    return respond(200, s || {});
  }

  if (method === 'POST') {
    if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });
    if (!body || typeof body !== 'object') return respond(400, { error: 'Expected settings object' });
    await store.set(KEY, body);
    return respond(200, { ok: true });
  }

  return respond(405, { error: 'Method not allowed' });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
