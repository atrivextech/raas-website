/* ═══════════════════════════════════════════════════════════
   RAAS — Key-value storage adapter (Vercel + AWS)

   Auto-detects which backend to use (first match wins):
     1. DynamoDB  — when DYNAMODB_TABLE is set (AWS)
     2. Upstash   — when UPSTASH_REDIS_REST_URL is set (Vercel)
     3. In-memory  — fallback for local dev (resets on cold start)

   Public API: get(key), set(key, val), del(key)
   All values are stored as JSON strings internally.
═══════════════════════════════════════════════════════════ */

const https = require('node:https');
const http  = require('node:http');

// ═══ Detection ═══════════════════════════════════════════
function useDynamo()  { return !!process.env.DYNAMODB_TABLE; }
function useUpstash() { return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN); }
function storageType() {
  if (useDynamo())  return 'dynamodb';
  if (useUpstash()) return 'upstash';
  return 'memory';
}

// ═══ In-memory fallback ══════════════════════════════════
const memStore = new Map();

// ═══ Upstash Redis REST ══════════════════════════════════
function upstashRequest(method, args) {
  return new Promise((resolve, reject) => {
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
    const payload = JSON.stringify([method, ...args]);
    const mod = url.protocol === 'https:' ? https : http;

    const req = mod.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result !== undefined ? json.result : null);
        } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ═══ DynamoDB (AWS SDK v3-style, using raw HTTPS) ════════
//
// Uses the DynamoDB JSON HTTP API directly — no aws-sdk needed.
// Table schema: pk (String, partition key) | data (String, JSON blob)
//
// Auth: uses Lambda's execution role automatically via
//       AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_SESSION_TOKEN
//       (these are set by Lambda runtime, no manual config needed)

const crypto = require('node:crypto');

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

function dynamoRequest(action, payload) {
  const region = process.env.AWS_REGION || 'ap-south-1';
  const host = `dynamodb.${region}.amazonaws.com`;
  const body = JSON.stringify(payload);
  let headers = {
    'Host': host,
    'Content-Type': 'application/x-amz-json-1.0',
    'X-Amz-Target': `DynamoDB_20120810.${action}`,
    'Content-Length': String(Buffer.byteLength(body))
  };
  headers = awsSign('POST', '/', headers, body, 'dynamodb', region);

  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: host, method: 'POST', path: '/', headers }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ═══ Public API ══════════════════════════════════════════

async function get(key) {
  // DynamoDB
  if (useDynamo()) {
    const res = await dynamoRequest('GetItem', {
      TableName: process.env.DYNAMODB_TABLE,
      Key: { pk: { S: key } }
    });
    if (!res || !res.Item || !res.Item.data) return null;
    try { return JSON.parse(res.Item.data.S); } catch { return null; }
  }

  // Upstash
  if (useUpstash()) {
    const val = await upstashRequest('GET', [key]);
    if (val === null || val === undefined) return null;
    try { return JSON.parse(val); } catch { return val; }
  }

  // Memory
  return memStore.has(key) ? memStore.get(key) : null;
}

async function set(key, value) {
  const json = JSON.stringify(value);

  if (useDynamo()) {
    await dynamoRequest('PutItem', {
      TableName: process.env.DYNAMODB_TABLE,
      Item: { pk: { S: key }, data: { S: json } }
    });
    return;
  }

  if (useUpstash()) {
    await upstashRequest('SET', [key, json]);
    return;
  }

  memStore.set(key, value);
}

async function del(key) {
  if (useDynamo()) {
    await dynamoRequest('DeleteItem', {
      TableName: process.env.DYNAMODB_TABLE,
      Key: { pk: { S: key } }
    });
    return;
  }

  if (useUpstash()) {
    await upstashRequest('DEL', [key]);
    return;
  }

  memStore.delete(key);
}

module.exports = { get, set, del, useDynamo, useUpstash, storageType };
