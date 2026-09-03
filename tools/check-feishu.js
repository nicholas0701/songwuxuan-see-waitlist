#!/usr/bin/env node
/**
 * 飞书 Webhook 配置自检工具
 *
 * 用途：在配好 FEISHU_WEBHOOK 后，不填表单、不访问站点，直接验证机器人能不能收到消息。
 * 原理：复用 api/_core.js 里的真实 pushFeishu 逻辑，所见即线上所为。
 *
 * 用法：
 *   node tools/check-feishu.js https://open.feishu.cn/open-apis/bot/v2/hook/xxxx
 *   或：FEISHU_WEBHOOK=xxx node tools/check-feishu.js
 *
 * 退出码：0 = 配置正确可送达；1 = 有问题（会打印具体原因）
 */
const path = require('path');

async function main() {
  const url = process.argv[2] || process.env.FEISHU_WEBHOOK;

  if (!url) {
    console.log('用法：node tools/check-feishu.js <webhook_url>');
    console.log('  或：FEISHU_WEBHOOK=<url> node tools/check-feishu.js');
    process.exit(1);
  }

  if (!/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//.test(url)) {
    console.log('⚠️  URL 格式看起来不对。');
    console.log('   正确格式：https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    console.log('   你填的是：' + url);
    console.log('   请回到飞书群 → 群设置 → 群机器人 → 复制完整的 Webhook 地址。');
    process.exit(1);
  }

  // 复用真实逻辑，测的就是线上会跑的代码
  process.env.FEISHU_WEBHOOK = url;
  const core = require(path.join(__dirname, '..', 'api', '_core.js'));

  const record = {
    time: new Date().toISOString(),
    name: '配置自检',
    role: '其他法律从业者',
    phone: '13800000000',
    wechat: '-',
    field: '-',
    interest: '-',
    note: '这是一条配置自检消息，收到即代表链路正常。'
  };

  console.log('正在向飞书群发送测试消息…\n');
  const r = await core.pushFeishu(record);

  if (r.ok) {
    console.log('✅ 配置正确，飞书群应该已经收到测试消息了。');
    console.log('   去飞书看一眼，确认能收到「【松悟轩·see 新登记】配置自检」。');
    console.log('\n下一步：把这条 Webhook 填进 Vercel 环境变量 FEISHU_WEBHOOK 并 Redeploy。');
    process.exit(0);
  }

  console.log('❌ 发送失败：' + r.reason);
  if (r.detail) console.log('   详情：' + r.detail);

  // 常见错误的人话解释
  const hint = {
    not_configured: '没有读到 Webhook 地址，检查参数是否传入。',
    feishu_code_19021: [
      '飞书拒绝了这条消息，最常见两个原因：',
      '  1) 关键词不匹配 —— 机器人的安全设置里请选「自定义关键词」并填：松悟轩',
      '     （本工具发的消息含「松悟轩·see」，只要关键词设对就能通过）',
      '  2) 选了「签名校验」 —— 当前代码不支持签名方式，请改成自定义关键词。'
    ].join('\n'),
    feishu_code_19001: '机器人不存在或已被停用。请到飞书群里重新添加机器人并复制新的 Webhook。',
    feishu_code_19022: 'IP 白名单限制。请到机器人安全设置里移除 IP 白名单，或改用「自定义关键词」。',
    http_404: 'Webhook 地址无效（404）。请重新从飞书群复制完整地址。'
  }[r.reason];

  if (hint) console.log('\n💡 处理建议：\n' + hint);
  if (r.reason === 'exception') {
    console.log('\n💡 网络异常，检查本机能否访问 open.feishu.cn。');
  }
  process.exit(1);
}

main();
