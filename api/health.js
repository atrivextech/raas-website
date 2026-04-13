/* GET /api/health — backend availability check */
const { backendReady, respond } = require('./_lib/auth');
const { storageType } = require('./_lib/store');
const { emailProvider } = require('./_lib/email');
const { vercelWrap } = require('./_lib/adapter');

async function handle({ method }) {
  if (method === 'OPTIONS') return respond(204, '');

  return respond(200, {
    ok: true,
    backend: backendReady(),
    storage: storageType(),
    email: emailProvider(),
    timestamp: new Date().toISOString()
  });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
