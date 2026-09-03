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

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 浏览器直接打开时给中文诊断页（非工程用户友好）；程序调用仍返回 JSON
function renderHtml(d) {
  const ok = d.feishu.configured;
  const icon = ok ? '✅' : '❌';
  const verdict = ok ? '飞书配置已生效' : '飞书配置未生效';
  const sub = ok
    ? '环境变量 FEISHU_WEBHOOK 已注入，用户提交登记后会实时推送到你的飞书群。'
    : '函数读不到 FEISHU_WEBHOOK。此时用户提交登记，数据只会落在临时盘上，实例回收即丢失。';

  const rows = [];
  if (d.feishu.webhook) {
    rows.push(['Webhook', esc(d.feishu.webhook.prefix) + '（长度 ' + esc(d.feishu.webhook.length) + '，仅显示前 8 位以确认是哪一个）']);
    rows.push(['地址格式', d.feishu.webhook.looksValid ? '正确' : '⚠️ 格式异常，请重新复制']);
  }
  rows.push(['导出接口 /api/export', d.export.enabled ? '已启用' : '未启用（未配置 ADMIN_TOKEN）']);
  rows.push(['临时盘记录数', esc(d.tmpRecords) + ' 条（仅供参考，实例回收即清空，完整名单以飞书为准）']);

  const steps = ok ? `
    <div class="next">
      <div class="next-t">下一步</div>
      <p>去 <a href="/" target="_blank">登记页</a> 提交一次表单，手机飞书应立刻收到通知。收到即代表全链路打通。</p>
    </div>` : `
    <div class="steps">
      <div class="next-t">按这 3 步排查</div>
      <ol>
        <li>变量名是否<b>精确</b>为 <code>FEISHU_WEBHOOK</code>（大小写敏感）</li>
        <li>Environment 是否勾选了 <b>Production</b></li>
        <li>保存后是否 <b>Redeploy</b>：Deployments → 最新一次 → ⋯ → Redeploy<br><span class="dim">环境变量改动必须重新部署才会注入。</span></li>
      </ol>
    </div>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>松悟轩·see · 配置诊断</title>
<style>
  :root{--bg:#F8F6F1;--card:#FFFFFF;--ink:#202020;--sub:#5A5A5A;--line:#E6E1D8;--gold:#8B7355;}
  @media (prefers-color-scheme:dark){
    :root{--bg:#161616;--card:#1F1F1F;--ink:#F0EEEA;--sub:#A8A29A;--line:#333;--gold:#B8943F;}
  }
  *{box-sizing:border-box}
  body{margin:0;padding:32px 20px;background:var(--bg);color:var(--ink);
       font:16px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif;}
  .wrap{max-width:620px;margin:0 auto}
  .brand{font-size:15px;letter-spacing:.08em;color:var(--gold);margin-bottom:18px}
  .brand span{opacity:.65}
  h1{font-size:22px;margin:0 0 18px;font-weight:600;letter-spacing:.02em}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px}
  .verdict{display:flex;align-items:center;gap:12px;font-size:19px;font-weight:600;margin-bottom:8px}
  .sub{color:var(--sub);font-size:14.5px;line-height:1.75}
  table{width:100%;border-collapse:collapse;background:var(--card);
        border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-bottom:16px}
  td{padding:13px 16px;border-bottom:1px solid var(--line);font-size:14.5px;vertical-align:top}
  tr:last-child td{border-bottom:none}
  td:first-child{width:38%;color:var(--sub);white-space:nowrap}
  td:last-child{word-break:break-all}
  .steps,.next{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px}
  .next-t{font-weight:600;margin-bottom:10px;font-size:15.5px}
  ol{margin:0;padding-left:20px}
  li{margin-bottom:12px;font-size:14.5px}
  li:last-child{margin-bottom:0}
  code{background:rgba(139,115,85,.12);padding:2px 6px;border-radius:4px;font-size:13.5px}
  .dim{color:var(--sub);font-size:13.5px}
  a{color:var(--gold)}
  p{margin:0;font-size:14.5px;color:var(--sub)}
  footer{margin-top:22px;font-size:12.5px;color:var(--sub);text-align:center;opacity:.75}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">松悟轩<span>·see</span></div>
  <h1>配置诊断</h1>
  <div class="card">
    <div class="verdict"><span>${icon}</span><span>${verdict}</span></div>
    <div class="sub">${sub}</div>
  </div>
  <table>
    ${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('\n    ')}
  </table>
  ${steps}
  <footer>诊断时间 ${esc(d.time)}</footer>
</div>
</body>
</html>`;
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

  // 浏览器（Accept 含 text/html）→ 中文诊断页；程序调用 / ?format=json → JSON
  const accept = String((req.headers && req.headers.accept) || '');
  const wantHtml = q.format === 'html' || (q.format !== 'json' && accept.indexOf('text/html') !== -1);
  if (wantHtml) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderHtml(out));
  }
  return res.status(200).json(out);
};
