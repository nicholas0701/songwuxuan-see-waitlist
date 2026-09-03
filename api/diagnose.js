// Vercel Serverless Function: GET /api/diagnose
// 用途：一眼确认环境变量是否真的注入生效，免得靠"填表单等飞书响"去猜。
// 设计原则：默认输出最小化（不含任何密钥）；真实推送测试必须持 ADMIN_TOKEN，防止开放接口被用来刷群。
const fs = require('fs');
const path = require('path');

function safeEqual(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 只暴露能"确认是哪一个"的最小信息，绝不回显完整密钥
function maskWebhook(u) {
  const id = String(u).split('/').pop() || '';
  return {
    prefix: id.slice(0, 8) + '…',
    length: id.length,
    looksValid: /^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/[0-9a-fA-F-]{8,}$/.test(u)
  };
}

function countTmpRecords() {
  try {
    const p = path.join(process.env.RAW_DIR || '/tmp', 'signups.json');
    if (!fs.existsSync(p)) return 0;
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(arr) ? arr.length : 0;
  } catch (_) {
    return 0;
  }
}

async function pushTest(url) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: '【松悟轩·see 新登记】诊断测试\n姓名：连通性自检\n身份：其他法律从业者\n手机：-\n微信：-\n领域：-\n意向：-\n留言：这条消息由 /api/diagnose 发出，收到即代表环境变量与飞书链路完全正常。' }
      })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { ok: false, reason: 'http_' + r.status, detail: t.slice(0, 300) };
    }
    const j = await r.json().catch(() => null);
    if (j && typeof j.code === 'number' && j.code !== 0) {
      return { ok: false, reason: 'feishu_code_' + j.code, detail: j.msg || '' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'exception', detail: String((e && e.message) || e) };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: '仅支持 GET' });

  const hook = process.env.FEISHU_WEBHOOK || '';
  const adminToken = process.env.ADMIN_TOKEN || '';

  const out = {
    ok: true,
    time: new Date().toISOString(),
    feishu: {
      configured: hook.length > 0,
      hint: hook.length > 0
        ? '已读到 FEISHU_WEBHOOK，环境变量生效。'
        : '未读到 FEISHU_WEBHOOK。请依次检查：① 变量名是否精确（大小写敏感）② Environment 是否勾了 Production ③ 改完后是否 Redeploy。'
    },
    export: {
      enabled: adminToken.length > 0,
      hint: adminToken.length > 0
        ? '/api/export 已启用。'
        : '未配置 ADMIN_TOKEN，/api/export 默认关闭（安全默认，防忘配泄露）。'
    },
    tmpRecords: countTmpRecords(),
    note: 'tmpRecords 仅为当前实例临时盘上的条数，实例回收即清空，不代表完整名单。完整名单以飞书群消息为准。'
  };

  if (hook) out.feishu.webhook = maskWebhook(hook);

  // 可选：真实发一条测试推送（需 ADMIN_TOKEN，避免开放接口被用来刷群）
  const q = req.query || {};
  if (q.push === '1') {
    if (!adminToken) {
      return res.status(503).json({
        ...out,
        push: {
          ok: false,
          reason: 'admin_token_missing',
          detail: '未配置 ADMIN_TOKEN，测试推送已禁用。这是刻意设计：否则任何人访问此 URL 都能刷你的飞书群。配好 ADMIN_TOKEN 后即可使用。'
        }
      });
    }
    if (!safeEqual(q.token || '', adminToken)) {
      return res.status(401).json({ ...out, push: { ok: false, reason: 'bad_token' } });
    }
    if (!hook) {
      return res.status(200).json({ ...out, push: { ok: false, reason: 'webhook_missing', detail: 'FEISHU_WEBHOOK 未配置，无法推送。' } });
    }
    out.push = await pushTest(hook);
  }

  return res.status(200).json(out);
};
