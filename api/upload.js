/* POST /api/upload — admin uploads a file to Vercel Blob.
   Body: { filename, contentType, dataBase64 }  (data URL prefix stripped)
   Returns: { ok, url, pathname } */
const { backendReady, verifySession, respond } = require('./_lib/auth');
const { blobReady, uploadToBlob } = require('./_lib/blob');
const { vercelWrap } = require('./_lib/adapter');

// Keep under Vercel's serverless body limit (~4.5MB). base64 inflates ~33%.
const MAX_BYTES = 3.5 * 1024 * 1024;

function sanitize(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

async function handle({ method, headers, body }) {
  if (method === 'OPTIONS') return respond(204, '');
  if (!backendReady()) return respond(503, { error: 'Backend not configured' });
  if (method !== 'POST') return respond(405, { error: 'Method not allowed' });
  if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });
  if (!blobReady()) return respond(503, { error: 'File storage not configured (BLOB_READ_WRITE_TOKEN missing)' });

  if (!body || !body.dataBase64 || !body.filename) {
    return respond(400, { error: 'filename and dataBase64 are required' });
  }

  // Strip any "data:...;base64," prefix.
  const b64 = String(body.dataBase64).replace(/^data:[^;]+;base64,/, '');
  let buffer;
  try {
    buffer = Buffer.from(b64, 'base64');
  } catch {
    return respond(400, { error: 'Invalid file data' });
  }
  if (buffer.length === 0) return respond(400, { error: 'Empty file' });
  if (buffer.length > MAX_BYTES) {
    return respond(413, { error: 'File too large. Please keep each file under 3 MB.' });
  }

  const folder = sanitize(body.folder || 'uploads');
  const pathname = `${folder}/${Date.now()}-${sanitize(body.filename)}`;

  try {
    const { url, pathname: stored } = await uploadToBlob(pathname, body.contentType, buffer);
    return respond(200, { ok: true, url, pathname: stored });
  } catch (e) {
    return respond(502, { error: 'Upload failed', detail: String(e.message || e) });
  }
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
