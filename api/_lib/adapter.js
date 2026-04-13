/* ═══════════════════════════════════════════════════════════
   RAAS — Platform adapter (Vercel ↔ Lambda)

   Each route handler is a pure async function:
     async function handle({ method, headers, url, body }) → { statusCode, headers, body }

   This module wraps that pure function for each platform:
     vercelWrap(handle)  → (req, res) => void     (Vercel serverless)
     lambdaWrap(handle)  → (event)    => response  (AWS Lambda + API Gateway v2)
═══════════════════════════════════════════════════════════ */

// ─── Read Vercel/Node request body as parsed JSON ────────
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve(null);
      try { resolve(JSON.parse(data)); }
      catch { resolve(null); }
    });
  });
}

// ─── Normalize header keys to lowercase ──────────────────
function lowerHeaders(h) {
  if (!h) return {};
  const out = {};
  for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = v;
  return out;
}

// ─── Vercel wrapper ──────────────────────────────────────
function vercelWrap(handle) {
  return async function (req, res) {
    const body = await readBody(req);
    const result = await handle({
      method: req.method,
      headers: lowerHeaders(req.headers),
      url: req.url || '/',
      body
    });

    const outHeaders = result.headers || {};
    res.writeHead(result.statusCode || 200, outHeaders);
    res.end(result.body || '');
  };
}

// ─── AWS Lambda wrapper (API Gateway v2 / HTTP API) ──────
function lambdaWrap(handle) {
  return async function (event) {
    // Support both API Gateway v1 (REST) and v2 (HTTP)
    const method = event.httpMethod
      || (event.requestContext && event.requestContext.http && event.requestContext.http.method)
      || 'GET';

    const rawPath = event.rawPath || event.path || '/';
    const qs = event.rawQueryString || '';
    const url = qs ? `${rawPath}?${qs}` : rawPath;

    let body = null;
    if (event.body) {
      if (event.isBase64Encoded) {
        try { body = JSON.parse(Buffer.from(event.body, 'base64').toString()); }
        catch { body = null; }
      } else {
        try { body = JSON.parse(event.body); }
        catch { body = null; }
      }
    }

    const result = await handle({
      method,
      headers: lowerHeaders(event.headers || {}),
      url,
      body
    });

    // Lambda response format (API Gateway v2)
    return {
      statusCode: result.statusCode || 200,
      headers: result.headers || {},
      body: result.body || ''
    };
  };
}

module.exports = { vercelWrap, lambdaWrap, lowerHeaders };
