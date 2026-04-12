/* GET /api/health — quick check for frontend to detect backend availability */
const { backendReady, headers } = require('./_lib/auth');
const { useUpstash } = require('./_lib/store');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers());
    return res.end();
  }

  const status = {
    ok: true,
    backend: backendReady(),
    storage: useUpstash() ? 'upstash' : 'memory',
    email: !!process.env.RESEND_API_KEY,
    timestamp: new Date().toISOString()
  };

  res.writeHead(200, headers()).end(JSON.stringify(status));
};
