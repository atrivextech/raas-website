/* ═══════════════════════════════════════════════════════════
   RAAS — Key-value storage adapter (Phase 2)

   Uses Upstash Redis (REST API) when UPSTASH_REDIS_REST_URL is set.
   Falls back to in-memory Map for local dev (resets on cold start).

   This is the ONLY file that touches storage — swap it for
   DynamoDB / Postgres / S3 later without touching any route.
═══════════════════════════════════════════════════════════ */

const https = require('node:https');
const http  = require('node:http');

// ─── In-memory fallback (dev / no-env) ───────────────────
const memStore = new Map();

function useUpstash() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// ─── Upstash REST helper ─────────────────────────────────
function upstashRequest(method, args) {
  return new Promise((resolve, reject) => {
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
    const payload = JSON.stringify([method, ...args]);
    const mod = url.protocol === 'https:' ? https : http;

    const req = mod.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result !== undefined ? json.result : null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Public API ──────────────────────────────────────────

async function get(key) {
  if (useUpstash()) {
    const val = await upstashRequest('GET', [key]);
    if (val === null || val === undefined) return null;
    try { return JSON.parse(val); } catch { return val; }
  }
  return memStore.has(key) ? memStore.get(key) : null;
}

async function set(key, value) {
  if (useUpstash()) {
    await upstashRequest('SET', [key, JSON.stringify(value)]);
    return;
  }
  memStore.set(key, value);
}

async function del(key) {
  if (useUpstash()) {
    await upstashRequest('DEL', [key]);
    return;
  }
  memStore.delete(key);
}

module.exports = { get, set, del, useUpstash };
