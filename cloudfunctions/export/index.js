// 腾讯云 CloudBase 云函数（HTTP 触发）：export
// 路径建议配置为 /api/export，与线上现有调用方式保持一致。
//
// ⚠️ core.js 由 tools/sync-cloudbase.js 从 api/_core.js 自动生成，请勿手改。
//    唯一真相源是 api/_core.js。

const { readRecords, safeEqual } = require('./core');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function resp(status, headers, body) {
  return {
    statusCode: status,
    headers: Object.assign({}, CORS, headers),
    isBase64Encoded: false,
    body
  };
}
function json(status, obj) {
  return resp(status, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify(obj));
}

exports.main = async (event) => {
  const method = String((event && event.httpMethod) || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, isBase64Encoded: false, body: '' };
  }
  if (method !== 'GET') return json(405, { message: '仅支持 GET' });

  const token = process.env.ADMIN_TOKEN;
  // 未配置时默认关闭，天然防"忘配导致公开泄露"
  if (!token) {
    return json(503, {
      message: '未配置 ADMIN_TOKEN，导出功能已禁用。请在云函数环境变量中设置后再试。'
    });
  }

  const query = (event && (event.queryStringParameters || event.query)) || {};
  const given = query.token || '';
  if (!safeEqual(given, token)) return json(401, { message: 'token 无效。' });

  const data = readRecords();

  if (query.format === 'csv') {
    const esc = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const header = 'time,name,role,phone,wechat,field,interest,note\n';
    const rows = data.map(r => [
      r.time, r.name, r.role, r.phone, r.wechat,
      r.field || '', r.interest || '', r.note || ''
    ].map(esc).join(',')).join('\n');
    return resp(200, { 'Content-Type': 'text/csv; charset=utf-8' },
      '\uFEFF' + header + (rows ? rows + '\n' : ''));
  }

  return json(200, {
    count: data.length,
    data,
    note: '云函数的 /tmp 为临时存储，实例回收后数据会丢失，此结果可能不完整。飞书推送才是可靠数据源。'
  });
};
