/* POST /api/contact — save enquiry + optionally send email via Resend
   Phase 3: email notifications when RESEND_API_KEY is set.
   Always stores enquiry in KV regardless. */
const { backendReady, headers, parseBody } = require('./_lib/auth');
const store = require('./_lib/store');
const https = require('node:https');

const STORE_KEY = 'raas_enquiries';

function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'RAAS Website <noreply@raasbuilders.com>';
  if (!apiKey) return Promise.resolve(null); // skip if not configured

  return new Promise((resolve) => {
    const payload = JSON.stringify({ from, to: [to], subject, html });
    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers());
    return res.end();
  }

  if (!backendReady()) {
    return res.writeHead(503, headers()).end(JSON.stringify({
      error: 'Backend not configured',
      fallback: true
    }));
  }

  if (req.method !== 'POST') {
    return res.writeHead(405, headers()).end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const body = await parseBody(req);
  if (!body || !body.name || !body.phone) {
    return res.writeHead(400, headers()).end(JSON.stringify({ error: 'Name and phone required' }));
  }

  // Store enquiry
  const enquiries = (await store.get(STORE_KEY)) || [];
  const enquiry = {
    id: Date.now(),
    ...body,
    createdAt: new Date().toISOString()
  };
  enquiries.push(enquiry);
  await store.set(STORE_KEY, enquiries);

  // Send notification email if Resend is configured
  const notifyEmail = process.env.NOTIFY_EMAIL; // owner's email
  if (notifyEmail && process.env.RESEND_API_KEY) {
    const html = `
      <h2>New Enquiry from RAAS Website</h2>
      <p><strong>Name:</strong> ${body.name}</p>
      <p><strong>Phone:</strong> ${body.phone}</p>
      ${body.email ? `<p><strong>Email:</strong> ${body.email}</p>` : ''}
      <p><strong>Interest:</strong> ${body.interest || 'General'}</p>
      ${body.message ? `<p><strong>Message:</strong> ${body.message}</p>` : ''}
      <p><em>Sent at ${enquiry.createdAt}</em></p>
    `;
    await sendEmail(notifyEmail, `New enquiry from ${body.name}`, html);
  }

  return res.writeHead(200, headers()).end(JSON.stringify({ ok: true, id: enquiry.id }));
};
