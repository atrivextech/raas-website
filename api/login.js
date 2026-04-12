/* POST /api/login — admin authentication */
const { backendReady, createSessionCookie, clearSessionCookie, headers, parseBody } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers());
    return res.end();
  }

  if (!backendReady()) {
    return res.writeHead(503, headers()).end(JSON.stringify({
      error: 'Backend not configured. Set SESSION_SECRET + ADMIN_PASSWORD in Vercel env vars.'
    }));
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    if (!body || !body.username || !body.password) {
      return res.writeHead(400, headers()).end(JSON.stringify({ error: 'Missing credentials' }));
    }

    const validUser = body.username === (process.env.ADMIN_USERNAME || 'admin');
    const validPass = body.password === process.env.ADMIN_PASSWORD;

    if (validUser && validPass) {
      const cookie = createSessionCookie();
      return res.writeHead(200, headers({ 'Set-Cookie': cookie })).end(
        JSON.stringify({ ok: true })
      );
    }

    return res.writeHead(401, headers()).end(JSON.stringify({ error: 'Invalid credentials' }));
  }

  // DELETE /api/login — logout
  if (req.method === 'DELETE') {
    return res.writeHead(200, headers({ 'Set-Cookie': clearSessionCookie() })).end(
      JSON.stringify({ ok: true })
    );
  }

  res.writeHead(405, headers()).end(JSON.stringify({ error: 'Method not allowed' }));
};
