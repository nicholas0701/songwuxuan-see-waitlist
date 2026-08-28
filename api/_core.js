// 共享核心逻辑：校验 + 落盘 + 可选飞书推送
const fs = require('fs');
const path = require('path');

const ALLOWED_ROLES = new Set([
  '执业律师（0–3 年）','执业律师（3–10 年）','合伙人 / 主任（10 年+）',
  '律所管理者 / 品牌负责人','企业法务','其他法律从业者'
]);

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

    const header = 'time,name,role,phone,wechat,field,interest,note\n';
    const line = [
      record.time, q(record.name), q(record.role), q(record.phone),
      q(record.wechat), q(record.field || ''), q(record.interest || ''), q(record.note || '')
    ].join(',');
    const needHeader = !fs.existsSync(csvPath);
    fs.appendFileSync(csvPath, (needHeader ? header : '') + line + '\n');
  } catch (e) {
    console.error('appendData error', e);
  }
}

async function pushFeishu(record) {
  const url = process.env.FEISHU_WEBHOOK;
  if (!url) return;
  try {
    const text = `【松悟轩·see 新登记】\n姓名：${record.name}\n身份：${record.role}\n手机：${record.phone}\n微信：${record.wechat}\n领域：${record.field || '-'}\n意向：${record.interest || '-'}\n留言：${record.note || '-'}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } })
    });
  } catch (e) {
    console.error('feishu push error', e);
  }
}

// 返回 { status, body } 或抛错
async function handleSignup(body, ip) {
  if (rateLimited(ip)) {
    return { status: 429, body: { message: '提交过于频繁，请稍后再试。' } };
  }
  const name = (body.name || '').trim();
  const role = (body.role || '').trim();
  const phone = (body.phone || '').trim();
  const wechat = (body.wechat || '').trim();

  if (!name || !role || !phone || !wechat) {
    return { status: 400, body: { message: '请填写姓名、身份、手机号、微信号。' } };
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { status: 400, body: { message: '手机号格式不正确。' } };
  }
  if (role && !ALLOWED_ROLES.has(role)) {
    return { status: 400, body: { message: '身份选项不合法。' } };
  }
  if (body.company_url && String(body.company_url).trim() !== '') {
    return { status: 200, body: { message: '登记成功！' } }; // honeypot 静默丢弃
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
  await pushFeishu(record);
  return { status: 200, body: { message: '登记成功，早鸟权益已为您预留！' } };
}

module.exports = { handleSignup };
