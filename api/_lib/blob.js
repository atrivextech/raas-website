/* ═══════════════════════════════════════════════════════════
   RAAS — Vercel Blob adapter (file storage for documents/photos)

   Files (PDFs, images) are stored in Vercel Blob and served from a
   public URL. The KV store only keeps metadata (title, url, type).
   No SDK — uses the Blob REST API over node:https, consistent with
   store.js / email.js.

   Env: BLOB_READ_WRITE_TOKEN  (added by the Vercel Blob integration)
═══════════════════════════════════════════════════════════ */

const https = require('node:https');

const BLOB_HOST = 'blob.vercel-storage.com';
const API_VERSION = '7';

// The token is normally BLOB_READ_WRITE_TOKEN, but the Vercel integration
// can inject it under a store-prefixed name. Find it either way.
function blobTokenValue() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find(k => /BLOB_READ_WRITE_TOKEN$/i.test(k));
  return key ? process.env[key] : '';
}

function blobReady() { return !!blobTokenValue(); }

/** Debug helper: names (not values) of env vars that look Blob-related. */
function blobEnvKeys() {
  return Object.keys(process.env).filter(k => /BLOB/i.test(k));
}

/**
 * Upload a buffer to Vercel Blob (public). Returns { url, pathname }.
 * pathname is a logical path like "brochures/1718-name.pdf".
 */
function uploadToBlob(pathname, contentType, buffer) {
  return new Promise((resolve, reject) => {
    const token = blobTokenValue();
    if (!token) return reject(new Error('BLOB_READ_WRITE_TOKEN not set'));

    // Keep slashes as path separators, encode the rest.
    const path = '/' + pathname.split('/').map(encodeURIComponent).join('/');

    const req = https.request({
      hostname: BLOB_HOST,
      method: 'PUT',
      path,
      headers: {
        authorization: `Bearer ${token}`,
        'x-api-version': API_VERSION,
        'x-content-type': contentType || 'application/octet-stream',
        'x-add-random-suffix': '1',
        'content-length': buffer.length
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (res.statusCode < 300 && j && j.url) resolve({ url: j.url, pathname: j.pathname });
          else reject(new Error(`Blob upload ${res.statusCode}: ${data}`));
        } catch {
          reject(new Error(`Blob upload bad response ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

/** Best-effort delete of a blob by its public URL. Never throws. */
function deleteBlob(url) {
  return new Promise((resolve) => {
    const token = blobTokenValue();
    if (!token || !url) return resolve(false);
    const body = JSON.stringify({ urls: [url] });
    const req = https.request({
      hostname: BLOB_HOST,
      method: 'POST',
      path: '/delete',
      headers: {
        authorization: `Bearer ${token}`,
        'x-api-version': API_VERSION,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body)
      }
    }, (res) => { res.on('data', () => {}); res.on('end', () => resolve(res.statusCode < 300)); });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

module.exports = { blobReady, blobEnvKeys, uploadToBlob, deleteBlob };
