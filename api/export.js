// Vercel Serverless Function: GET /api/export?token=xxx
// 用途：随时在线拉取已登记的名单（JSON / CSV 两种格式）
// 注意：Vercel 的 /tmp 是临时存储，实例回收后数据会丢。飞书推送才是可靠数据源，
//       此接口仅用于捞回"当前实例上还活着"的兜底副本。
const fs = require('fs');
const path = require('path');

// 恒定时间字符串比较，降低 token 爆破/时序侧信道风险
function safeEqual(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readRecords() {
  const dir = process.env.RAW_DIR || '/tmp';
  const jsonPath = path.join(dir, 'signups.json');
  try {
    if (!fs.existsSync(jsonPath)) return [];
    const arr = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: '仅支持 GET' });

  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(503).json({
      message: '未配置 ADMIN_TOKEN，导出功能已禁用。请在 Vercel 环境变量中设置后再试。'
    });
  }

  const given = (req.query && req.query.token) || '';
  if (!safeEqual(given, token)) {
    return res.status(401).json({ message: 'token 无效。' });
  }

  const data = readRecords();

  // CSV 格式：?token=xxx&format=csv
  if (req.query && req.query.format === 'csv') {
    const esc = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const header = 'time,name,role,phone,wechat,field,interest,note\n';
    const rows = data.map(r => [
      r.time, r.name, r.role, r.phone, r.wechat,
      r.field || '', r.interest || '', r.note || ''
    ].map(esc).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    // BOM：不加 Excel 打开中文会乱码
    return res.status(200).send('\uFEFF' + header + (rows ? rows + '\n' : ''));
  }

  return res.status(200).json({
    count: data.length,
    data,
    note: 'Vercel /tmp 为临时存储，实例回收后数据会丢失，此结果可能不完整。飞书推送才是可靠数据源。'
  });
};
