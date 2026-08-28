// Netlify Function: /.netlify/functions/signup
const { handleSignup } = require('../../api/_core');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(), body: JSON.stringify({ message: '仅支持 POST' }) };
  }
  const ip = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || '').split(',')[0].trim();
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (_) { return { statusCode: 400, headers: cors(), body: JSON.stringify({ message: '数据格式错误。' }) }; }

  const { status, body: out } = await handleSignup(body, ip);
  return { statusCode: status, headers: cors(), body: JSON.stringify(out) };
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}
