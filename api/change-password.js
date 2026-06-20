/* POST /api/change-password — admin changes their own password (session required).
   Stores a scrypt hash in the KV store; ADMIN_PASSWORD env is the bootstrap/fallback. */
const { backendReady, verifySession, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { hashPassword, verifyPassword } = require('./_lib/credentials');
const { vercelWrap } = require('./_lib/adapter');

const KEY = 'raas_admin_auth';

async function handle({ method, headers, body }) {
  if (method === 'OPTIONS') return respond(204, '');

  if (!backendReady()) {
    return respond(503, { error: 'Backend not configured' });
  }

  if (method !== 'POST') return respond(405, { error: 'Method not allowed' });
  if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });

  if (!body || !body.currentPassword || !body.newPassword) {
    return respond(400, { error: 'Current and new password are required' });
  }
  if (String(body.newPassword).length < 8) {
    return respond(400, { error: 'New password must be at least 8 characters' });
  }

  const stored = await store.get(KEY);

  // Verify the current password against the stored hash, or the env bootstrap password.
  let currentOk;
  if (stored && stored.hash) {
    currentOk = verifyPassword(body.currentPassword, stored);
  } else {
    currentOk = !!process.env.ADMIN_PASSWORD && body.currentPassword === process.env.ADMIN_PASSWORD;
  }
  if (!currentOk) return respond(401, { error: 'Current password is incorrect' });

  const { salt, hash } = hashPassword(body.newPassword);
  const username = (stored && stored.username) || process.env.ADMIN_USERNAME || 'admin';
  await store.set(KEY, { username, salt, hash, updatedAt: new Date().toISOString() });

  return respond(200, { ok: true });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
