/* eslint-disable */
// ⚠️ 本文件由 tools/sync-cloudbase.js 自动生成，请勿手工修改。
// 唯一真相源：api/_core.js。改逻辑请改那里，然后运行：node tools/sync-cloudbase.js
// 共享核心逻辑：校验 + 落盘 + 飞书推送（主通道）+ 日志兜底
const fs = require('fs');
const path = require('path');

const ALLOWED_ROLES = new Set([
  '执业律师（0–3 年）','执业律师（3–10 年）','合伙人 / 主任（10 年+）',
  '律所管理者 / 品牌负责人','企业法务','其他法律从业者'
]);

// 限流：仅在单个函数实例内有效（serverless 多实例不共享，属尽力而为）
const hitLog = {};
function rateLimited(ip) {
  const now = Date.now();
  hitLog[ip] = (hitLog[ip] || []).filter(t => now - t < 60000);
  if (hitLog[ip].length >= 5) return true;
  hitLog[ip].push(now);
  return false;
}

function q(s) {
  s = (s == null ? '' : String(s)).replace(/"/g, '""');
  return '"' + s + '"';
}

/**
 * 落盘：写入 /tmp（Vercel 上为临时存储，实例回收即丢失）。
 * 定位：兜底副本，不是可靠数据源 —— 可靠数据源是飞书推送。
 */
function appendData(record) {
  try {
    const dir = process.env.RAW_DIR || '/tmp';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const jsonPath = path.join(dir, 'signups.json');
    const csvPath = path.join(dir, 'signups.csv');

    let arr = [];
    if (fs.existsSync(jsonPath)) {
      try { arr = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (_) { arr = []; }
    }
    arr.push(record);
    fs.writeFileSync(jsonPath, JSON.stringify(arr, null, 2));

    // BOM：不加 Excel 打开中文会乱码
    const BOM = '\uFEFF';
    const header = 'time,name,role,phone,wechat,field,interest,note\n';
    const line = [
      record.time, q(record.name), q(record.role), q(record.phone),
      q(record.wechat), q(record.field || ''), q(record.interest || ''), q(record.note || '')
    ].join(',');
    const needHeader = !fs.existsSync(csvPath);
    fs.appendFileSync(csvPath, (needHeader ? BOM + header : '') + line + '\n');
  } catch (e) {
    console.error('appendData error', e);
  }
}

/**
 * 飞书推送：唯一可靠的数据出口。
 * 返回 { ok, reason, detail } —— 调用方必须根据 ok 判断是否要兜底告警。
 */
async function pushFeishu(record) {
  const url = process.env.FEISHU_WEBHOOK;
  if (!url) return { ok: false, reason: 'not_configured', detail: '未配置 FEISHU_WEBHOOK' };

  const text = `【松悟轩·see 新登记】\n姓名：${record.name}\n身份：${record.role}\n手机：${record.phone}\n微信：${record.wechat}\n领域：${record.field || '-'}\n意向：${record.interest || '-'}\n留言：${record.note || '-'}`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } })
    });

    // HTTP 层失败
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { ok: false, reason: 'http_' + r.status, detail: t.slice(0, 300) };
    }

    // 飞书业务层：HTTP 200 但 code != 0 也是失败（如被限流、签名校验失败）
    const j = await r.json().catch(() => null);
    if (j && typeof j.code === 'number' && j.code !== 0) {
      return { ok: false, reason: 'feishu_code_' + j.code, detail: j.msg || '' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'exception', detail: String((e && e.message) || e) };
  }
}

/**
 * 返回 { status, body, delivered, reason }
 * delivered=false 表示数据未送达飞书，调用方须告警（否则客户静默丢失）
 */
async function handleSignup(body, ip) {
  if (rateLimited(ip)) {
    return { status: 429, body: { message: '提交过于频繁，请稍后再试。' }, delivered: false, reason: 'rate_limited' };
  }
  const name = (body.name || '').trim();
  const role = (body.role || '').trim();
  const phone = (body.phone || '').trim();
  const wechat = (body.wechat || '').trim();

  if (!name || !role || !phone || !wechat) {
    return { status: 400, body: { message: '请填写姓名、身份、手机号、微信号。' }, delivered: false, reason: 'invalid' };
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { status: 400, body: { message: '手机号格式不正确。' }, delivered: false, reason: 'invalid' };
  }
  if (role && !ALLOWED_ROLES.has(role)) {
    return { status: 400, body: { message: '身份选项不合法。' }, delivered: false, reason: 'invalid' };
  }
  if (body.company_url && String(body.company_url).trim() !== '') {
    // honeypot：机器人静默丢弃，不落盘不推送
    return { status: 200, body: { message: '登记成功！' }, delivered: false, reason: 'honeypot' };
  }

  const record = {
    time: new Date().toISOString(),
    name, role, phone, wechat,
    field: (body.field || '').trim(),
    interest: (body.interest || '').trim(),
    note: (body.note || '').trim(),
    ip
  };

  appendData(record);
  const push = await pushFeishu(record);

  if (!push.ok) {
    // 兜底：结构化日志落 Vercel Logs（保留 7 天），可事后捞回，避免客户静默丢失
    console.error('[SIGNUP_UNDELIVERED] ' + JSON.stringify({
      reason: push.reason,
      detail: push.detail,
      record
    }));
  }

  return {
    status: 200,
    body: { message: '登记成功，早鸟权益已为您预留！' },
    delivered: push.ok,
    reason: push.ok ? '' : push.reason
  };
}

// 恒定时间字符串比较，降低 token 爆破 / 时序侧信道风险
function safeEqual(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 读取兜底副本（/tmp）。注意：这是"尽力而为"的副本，不是可靠数据源。
function readRecords() {
  try {
    const jsonPath = path.join(process.env.RAW_DIR || '/tmp', 'signups.json');
    if (!fs.existsSync(jsonPath)) return [];
    const arr = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

module.exports = { handleSignup, appendData, pushFeishu, readRecords, safeEqual };
