/* ═══════════════════════════════════════════════════════════
   RAAS — Single AWS Lambda handler
   Routes API Gateway requests to the correct handler.

   Deploy this as ONE Lambda function behind API Gateway v2.
   All routes share the same function → simpler, cheaper.

   API Gateway route: ANY /api/{proxy+} → this Lambda
═══════════════════════════════════════════════════════════ */

const { lambdaWrap } = require('../api/_lib/adapter');

// Import pure handlers (the .handle export from each route)
const healthHandle     = require('../api/health').handle;
const loginHandle      = require('../api/login').handle;
const propertiesHandle = require('../api/properties').handle;
const materialsHandle  = require('../api/materials').handle;
const settingsHandle   = require('../api/settings').handle;
const contactHandle    = require('../api/contact').handle;

// Route map
const routes = {
  '/api/health':     healthHandle,
  '/api/login':      loginHandle,
  '/api/properties': propertiesHandle,
  '/api/materials':  materialsHandle,
  '/api/settings':   settingsHandle,
  '/api/contact':    contactHandle,
};

// Single Lambda entry point
exports.handler = async function (event, context) {
  // Extract path — works with API Gateway v1 and v2
  const path = event.rawPath || event.path || '/';

  // Clean trailing slash, normalise
  const normalized = path.replace(/\/+$/, '') || '/';

  const handle = routes[normalized];

  if (!handle) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found', path: normalized })
    };
  }

  // Use the Lambda adapter to call the platform-neutral handler
  const wrapped = lambdaWrap(handle);
  return wrapped(event, context);
};
