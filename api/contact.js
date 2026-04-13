/* POST /api/contact — store enquiry + send notification email */
const { backendReady, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { sendEmail, emailReady } = require('./_lib/email');
const { vercelWrap } = require('./_lib/adapter');

function escHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const KEY = 'raas_enquiries';

async function handle({ method, body }) {
  if (method === 'OPTIONS') return respond(204, '');

  if (!backendReady()) {
    return respond(503, { error: 'Backend not configured', fallback: true });
  }

  if (method !== 'POST') return respond(405, { error: 'Method not allowed' });

  if (!body || !body.name || !body.phone) {
    return respond(400, { error: 'Name and phone required' });
  }
  // Validate phone: 10-15 digits
  const phoneClean = String(body.phone).replace(/\D/g, '');
  if (phoneClean.length < 10 || phoneClean.length > 15) {
    return respond(400, { error: 'Invalid phone number' });
  }
  // Validate email format if provided
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return respond(400, { error: 'Invalid email format' });
  }

  // Store enquiry
  const enquiries = (await store.get(KEY)) || [];
  const enquiry = {
    id: Date.now(),
    ...body,
    createdAt: new Date().toISOString()
  };
  enquiries.push(enquiry);
  await store.set(KEY, enquiries);

  // Send notification email (Resend or SES, whichever is configured)
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (notifyEmail && emailReady()) {
    const html = `
      <h2>New Enquiry from RAAS Website</h2>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:6px 12px;font-weight:bold;">Name</td><td style="padding:6px 12px;">${escHtml(body.name)}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;">Phone</td><td style="padding:6px 12px;">${escHtml(body.phone)}</td></tr>
        ${body.email ? `<tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;">${escHtml(body.email)}</td></tr>` : ''}
        <tr><td style="padding:6px 12px;font-weight:bold;">Interest</td><td style="padding:6px 12px;">${escHtml(body.interest) || 'General'}</td></tr>
        ${body.message ? `<tr><td style="padding:6px 12px;font-weight:bold;">Message</td><td style="padding:6px 12px;">${escHtml(body.message)}</td></tr>` : ''}
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px;">Sent at ${enquiry.createdAt}</p>
    `;
    await sendEmail(notifyEmail, `New enquiry from ${escHtml(body.name)}`, html);
  }

  return respond(200, { ok: true, id: enquiry.id });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
