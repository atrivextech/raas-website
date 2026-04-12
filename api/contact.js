/* POST /api/contact — store enquiry + send notification email */
const { backendReady, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { sendEmail, emailReady } = require('./_lib/email');
const { vercelWrap } = require('./_lib/adapter');

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
        <tr><td style="padding:6px 12px;font-weight:bold;">Name</td><td style="padding:6px 12px;">${body.name}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;">Phone</td><td style="padding:6px 12px;">${body.phone}</td></tr>
        ${body.email ? `<tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;">${body.email}</td></tr>` : ''}
        <tr><td style="padding:6px 12px;font-weight:bold;">Interest</td><td style="padding:6px 12px;">${body.interest || 'General'}</td></tr>
        ${body.message ? `<tr><td style="padding:6px 12px;font-weight:bold;">Message</td><td style="padding:6px 12px;">${body.message}</td></tr>` : ''}
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px;">Sent at ${enquiry.createdAt}</p>
    `;
    await sendEmail(notifyEmail, `New enquiry from ${body.name}`, html);
  }

  return respond(200, { ok: true, id: enquiry.id });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
