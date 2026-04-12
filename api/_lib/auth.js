/* ═══════════════════════════════════════════════════════════
   RAAS — Serverless auth helpers (Phase 2)
   HMAC-signed session cookie. Zero external deps.

   Required env vars (set in Vercel dashboard):
     SESSION_SECRET  — random 32+ char string
     ADMIN_PASSWORD  — bcrypt-free plaintext for now (upgrade later)
     ADMIN_USERNAME  — (optional, defaults to "admin")
═══════════════════════════════════════════════════════════ */

const crypto = require('node:crypto');

const COOKIE_NAME = 'raas_session';
const TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret() {
  return process.env.SESSION_SECRET || '';
}

/** True when all required env vars are present */
function backendReady() {
  return !!(process.env.SESSION_SECRET && process.env.ADMIN_PASSWORD);
}

function sign(value) {
  const secret = getSecret();
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function createSessionCookie() {
  const exp = Date.now() + TTL_SECONDS * 1000;
  const payload = `admin.${exp}`;
  const sig = sign(payload);
  const value = `${payload}.${sig}`;
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Verify the session cookie on an incoming request */
function verifySession(req) {
  if (!backendReady()) return false;
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/raas_session=([^;]+)/);
  if (!m) return false;
  const parts = m[1].split('.');
  if (parts.length !== 3) return false;
  const [user, exp, sig] = parts;
  if (user !== 'admin') return false;
  if (Number(exp) < Date.now()) return false;
  const expected = sign(`${user}.${exp}`);
  if (!expected) return false;
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(sig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Standard CORS + JSON headers */
function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-RAAS-Client',
    ...extra
  };
}

/** Parse JSON body safely */
async function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve(null); }
    });
  });
}

module.exports = {
  backendReady,
  createSessionCookie,
  clearSessionCookie,
  verifySession,
  headers,
  parseBody
};
