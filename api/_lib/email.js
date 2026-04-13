/* ═══════════════════════════════════════════════════════════
   RAAS — Email adapter (Resend + SES)

   Auto-detects:
     1. Resend  — when RESEND_API_KEY is set (Vercel, any host)
     2. AWS SES — when SES_FROM_EMAIL is set (runs inside Lambda)
     3. No-op   — when neither is set (enquiry still stored in KV)
═══════════════════════════════════════════════════════════ */

const https = require('node:https');
const crypto = require('node:crypto');

// ─── Resend ──────────────────────────────────────────────
function sendViaResend(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'RAAS Website <noreply@raasbuilders.com>';

  return new Promise((resolve) => {
    const payload = JSON.stringify({ from, to: [to], subject, html });
    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload))
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ ok: res.statusCode < 300, data }));
    });
    req.on('error', () => resolve({ ok: false }));
    req.write(payload);
    req.end();
  });
}

// ─── AWS SES (v2 SendEmail via raw HTTPS, no SDK) ───────
function awsSign(method, path, headers, body, service, region) {
  const access = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  const token  = process.env.AWS_SESSION_TOKEN;
  if (!access || !secret) return headers;

  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const amzDate  = dateStamp + 'T' + now.toISOString().replace(/[-:]/g, '').slice(9, 15) + 'Z';

  headers['x-amz-date'] = amzDate;
  if (token) headers['x-amz-security-token'] = token;

  const signedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalHeaders = signedHeaderKeys.map(k =>
    `${k}:${headers[Object.keys(headers).find(h => h.toLowerCase() === k)].trim()}`
  ).join('\n') + '\n';

  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const canonical = [method, path, '', canonicalHeaders, signedHeaders, bodyHash].join('\n');
  const canonHash = crypto.createHash('sha256').update(canonical).digest('hex');

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const strToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${canonHash}`;

  const kDate    = crypto.createHmac('sha256', `AWS4${secret}`).update(dateStamp).digest();
  const kRegion  = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSign    = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const sig      = crypto.createHmac('sha256', kSign).update(strToSign).digest('hex');

  headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
  return headers;
}

function sendViaSES(to, subject, html) {
  const region = process.env.AWS_REGION || 'ap-south-1';
  const from = process.env.SES_FROM_EMAIL;
  const host = `email.${region}.amazonaws.com`;

  // SES v2 SendEmail
  const payload = JSON.stringify({
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } }
      }
    },
    Destination: { ToAddresses: [to] },
    FromEmailAddress: from
  });

  let headers = {
    'Host': host,
    'Content-Type': 'application/json',
    'Content-Length': String(Buffer.byteLength(payload))
  };
  headers = awsSign('POST', '/v2/email/outbound-emails', headers, payload, 'ses', region);

  return new Promise((resolve) => {
    const req = https.request({
      hostname: host, method: 'POST',
      path: '/v2/email/outbound-emails', headers
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ ok: res.statusCode < 300, data }));
    });
    req.on('error', () => resolve({ ok: false }));
    req.write(payload);
    req.end();
  });
}

// ─── Public API ──────────────────────────────────────────

function emailReady() {
  return !!(process.env.RESEND_API_KEY || process.env.SES_FROM_EMAIL);
}

function emailProvider() {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SES_FROM_EMAIL) return 'ses';
  return 'none';
}

async function sendEmail(to, subject, html) {
  if (process.env.RESEND_API_KEY) return sendViaResend(to, subject, html);
  if (process.env.SES_FROM_EMAIL) return sendViaSES(to, subject, html);
  return { ok: false, data: 'No email provider configured' };
}

module.exports = { sendEmail, emailReady, emailProvider };
