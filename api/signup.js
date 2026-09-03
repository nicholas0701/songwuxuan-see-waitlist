// Vercel Serverless Function: /api/signup
const { handleSignup } = require('./_core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: '仅支持 POST' });

  // 取 IP：Vercel 必带 x-forwarded-for；此处做防御性回退，避免极端情况下取不到 connection 导致 500
  const ip = (req.headers['x-forwarded-for'] || (req.connection || req.socket || {}).remoteAddress || '').split(',')[0].trim();
  let body;
  try { body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}'); }
  catch (_) { return res.status(400).json({ message: '数据格式错误。' }); }

  const { status, body: out, delivered, reason } = await handleSignup(body, ip);

  // 只有"真实登记却没送达飞书"才告警；400/429/蜜罐属正常业务分支，不告警
  if (status === 200 && !delivered && reason && reason !== 'honeypot') {
    console.error('[ALERT] 登记已落盘但未送达飞书，请检查 FEISHU_WEBHOOK 配置。reason=' + reason);
  }

  return res.status(status).json(out);
};
