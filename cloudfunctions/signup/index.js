// 腾讯云 CloudBase 云函数（HTTP 触发）：signup
// 路径建议配置为 /api/signup，这样 index.html 零改动。
//
// ⚠️ core.js 由 tools/sync-cloudbase.js 从 api/_core.js 自动生成，请勿手改。
//    唯一真相源是 api/_core.js。

const { handleSignup } = require('./core');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(status, obj) {
  return {
    statusCode: status,
    headers: Object.assign({}, CORS, { 'Content-Type': 'application/json; charset=utf-8' }),
    isBase64Encoded: false,
    body: JSON.stringify(obj)
  };
}

// CloudBase 可能给字符串 body，也可能已解析成对象；isBase64Encoded 时需解码
function decodeBody(event) {
  let raw = event.body;
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object') return raw;
  if (event.isBase64Encoded) {
    try { raw = Buffer.from(String(raw), 'base64').toString('utf8'); }
    catch (_) { return null; }
  }
  try { return JSON.parse(raw); }
  catch (_) { return null; }
}

exports.main = async (event) => {
  const method = String((event && event.httpMethod) || 'POST').toUpperCase();

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, isBase64Encoded: false, body: '' };
  }
  if (method !== 'POST') {
    return json(405, { message: '仅支持 POST' });
  }

  const body = decodeBody(event || {});
  if (body === null) {
    return json(400, { message: '数据格式错误。' });
  }

  const headers = (event && event.headers) || {};
  const rc = (event && event.requestContext) || {};
  const ip = String(
    headers['x-forwarded-for'] || headers['X-Forwarded-For'] || rc.sourceIp || ''
  ).split(',')[0].trim();

  const { status, body: out } = await handleSignup(body, ip);
  return json(status, out);
};
