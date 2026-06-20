/* ═══════════════════════════════════════════════════════════
   RAAS — Admin credential hashing (scrypt, no external deps)

   The admin password can be changed from the admin panel. The
   hashed value is stored in the KV store under `raas_admin_auth`.
   Until the client changes it, login falls back to the
   ADMIN_PASSWORD env var (bootstrap password).
═══════════════════════════════════════════════════════════ */

const crypto = require('node:crypto');

/** Hash a plaintext password → { salt, hash } (both hex). */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

/** Constant-time verify of a plaintext password against a stored { salt, hash }. */
function verifyPassword(password, stored) {
  if (!stored || !stored.salt || !stored.hash) return false;
  let computed;
  try {
    computed = crypto.scryptSync(String(password), stored.salt, 64).toString('hex');
  } catch {
    return false;
  }
  try {
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(stored.hash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
