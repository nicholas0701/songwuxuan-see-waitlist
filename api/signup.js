// Vercel Serverless Function: /api/signup
const { handleSignup } = require('./_core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: '仅支持 POST' });

  const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
  let body;
  try { body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}'); }
  catch (_) { return res.status(400).json({ message: '数据格式错误。' }); }

  const { status, body: out } = await handleSignup(body, ip);
  return res.status(status).json(out);
};
