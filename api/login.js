/* POST /api/login — admin authentication
   DELETE /api/login — logout */
const { backendReady, createSessionCookie, clearSessionCookie, verifySession, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { verifyPassword } = require('./_lib/credentials');
const { vercelWrap } = require('./_lib/adapter');

async function handle({ method, headers, body }) {
  if (method === 'OPTIONS') return respond(204, '');

  if (!backendReady()) {
    return respond(503, { error: 'Backend not configured. Set SESSION_SECRET + ADMIN_PASSWORD env vars.' });
  }

  // POST — login
  if (method === 'POST') {
    if (!body || !body.username || !body.password) {
      return respond(400, { error: 'Missing credentials' });
    }

    // A stored credential (set via /api/change-password) takes precedence;
    // otherwise fall back to the ADMIN_USERNAME / ADMIN_PASSWORD env bootstrap.
    const stored = await store.get('raas_admin_auth');
    const expectedUser = (stored && stored.username) || process.env.ADMIN_USERNAME || 'admin';
    const validUser = body.username === expectedUser;

    let validPass;
    if (stored && stored.hash) {
      validPass = verifyPassword(body.password, stored);
    } else {
      validPass = !!process.env.ADMIN_PASSWORD && body.password === process.env.ADMIN_PASSWORD;
    }

    if (validUser && validPass) {
      return respond(200, { ok: true }, { 'Set-Cookie': createSessionCookie() });
    }
    return respond(401, { error: 'Invalid credentials' });
  }

  // DELETE — logout
  if (method === 'DELETE') {
    return respond(200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
  }

  return respond(405, { error: 'Method not allowed' });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
