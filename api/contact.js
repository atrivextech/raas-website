/* POST /api/contact — store enquiry + send notification email */
const { backendReady, verifySession, respond } = require('./_lib/auth');
const store = require('./_lib/store');
const { sendEmail, emailReady } = require('./_lib/email');
const { vercelWrap } = require('./_lib/adapter');

function escHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const KEY = 'raas_enquiries';

async function handle({ method, headers, body }) {
  if (method === 'OPTIONS') return respond(204, '');

  if (!backendReady()) {
    return respond(503, { error: 'Backend not configured', fallback: true });
  }

  // GET — return all enquiries (admin only)
  if (method === 'GET') {
    if (!verifySession(headers)) return respond(401, { error: 'Unauthorized' });
    const enquiries = (await store.get(KEY)) || [];
    return respond(200, enquiries);
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
  // Check admin-configurable notify_email first, then fall back to env var
  let notifyEmail = process.env.NOTIFY_EMAIL;
  try {
    const siteSettings = await store.get('raas_site_settings');
    if (siteSettings && siteSettings.notify_email) {
      notifyEmail = siteSettings.notify_email;
    }
  } catch { /* use env var fallback */ }

  if (notifyEmail && emailReady()) {
    const interestLabels = {
      plots: 'Buying a Plot', land: 'Agricultural Land', apartment: 'Apartment',
      villa: 'Villa', commercial: 'Commercial Property',
      construction: 'House Construction', interiors: 'Interior Design',
      materials: 'Building Materials', other: 'General Enquiry'
    };
    const html = `
      <h2 style="color:#1A3C34;">New Enquiry from RAAS Website</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        <tr style="background:#f8f8f8;"><td style="padding:8px 12px;font-weight:bold;border:1px solid #eee;">Name</td><td style="padding:8px 12px;border:1px solid #eee;">${escHtml(body.name)}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:bold;border:1px solid #eee;">Phone</td><td style="padding:8px 12px;border:1px solid #eee;"><a href="tel:${escHtml(body.phone)}">${escHtml(body.phone)}</a></td></tr>
        ${body.email ? `<tr style="background:#f8f8f8;"><td style="padding:8px 12px;font-weight:bold;border:1px solid #eee;">Email</td><td style="padding:8px 12px;border:1px solid #eee;"><a href="mailto:${escHtml(body.email)}">${escHtml(body.email)}</a></td></tr>` : ''}
        <tr><td style="padding:8px 12px;font-weight:bold;border:1px solid #eee;">Interest</td><td style="padding:8px 12px;border:1px solid #eee;">${interestLabels[body.interest] || escHtml(body.interest) || 'General'}</td></tr>
        ${body.budget ? `<tr style="background:#f8f8f8;"><td style="padding:8px 12px;font-weight:bold;border:1px solid #eee;">Budget</td><td style="padding:8px 12px;border:1px solid #eee;">${escHtml(body.budget)}</td></tr>` : ''}
        ${body.timeline ? `<tr><td style="padding:8px 12px;font-weight:bold;border:1px solid #eee;">Timeline</td><td style="padding:8px 12px;border:1px solid #eee;">${escHtml(body.timeline)}</td></tr>` : ''}
        ${body.message ? `<tr style="background:#f8f8f8;"><td style="padding:8px 12px;font-weight:bold;border:1px solid #eee;">Message</td><td style="padding:8px 12px;border:1px solid #eee;">${escHtml(body.message)}</td></tr>` : ''}
      </table>
      <p style="margin-top:16px;">
        <a href="https://wa.me/${String(body.phone).replace(/\D/g, '')}?text=${encodeURIComponent('Hi ' + (body.name || '') + ', thanks for contacting RAAS Builders!')}" style="background:#25D366;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:bold;">💬 Reply on WhatsApp</a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:16px;">Received at ${enquiry.createdAt} via raasbuilders.com</p>
    `;
    await sendEmail(notifyEmail, `🏠 New enquiry from ${escHtml(body.name)} — ${interestLabels[body.interest] || 'General'}`, html);
  }

  return respond(200, { ok: true, id: enquiry.id });
}

module.exports = vercelWrap(handle);
module.exports.handle = handle;
