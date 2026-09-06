#!/usr/bin/env node
/**
 * 把 api/_core.js 同步到各 CloudBase 云函数目录（生成 core.js）。
 *
 * 为什么需要它：CloudBase 部署时按「单个函数目录」打包，不支持跨目录 require，
 * 所以每个函数目录里都得有一份 core.js。若手抄两份，改一处忘一处就会逻辑漂移，
 * 出现"Vercel 上正常、腾讯云上丢数据"这类极难排查的问题。
 *
 * 用法：node tools/sync-cloudbase.js
 * 约定：各云函数目录下的 core.js 是生成物，不要手改；唯一真相源是 api/_core.js。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'api', '_core.js');
const FUNCS_DIR = path.join(ROOT, 'cloudfunctions');

const BANNER = [
  '/* eslint-disable */',
  '// ⚠️ 本文件由 tools/sync-cloudbase.js 自动生成，请勿手工修改。',
  '// 唯一真相源：api/_core.js。改逻辑请改那里，然后运行：node tools/sync-cloudbase.js',
  ''
].join('\n');

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('[sync] 找不到源文件：' + SRC);
    process.exit(1);
  }
  const src = fs.readFileSync(SRC, 'utf8');

  const targets = [
    { dir: path.join(FUNCS_DIR, 'signup'), needs: ['handleSignup'] },
    { dir: path.join(FUNCS_DIR, 'export'), needs: ['readRecords', 'safeEqual'] }
  ];

  let ok = 0;
  for (const t of targets) {
    if (!fs.existsSync(t.dir)) {
      console.warn('[sync] 跳过（目录不存在）：' + t.dir);
      continue;
    }
    const out = path.join(t.dir, 'core.js');
    fs.writeFileSync(out, BANNER + src);
    console.log('[sync] 已生成 ' + path.relative(ROOT, out));

    // 校验：生成物里必须包含该函数依赖的导出，防止 _core.js 改坏后静默出错
    const missing = t.needs.filter(n => !new RegExp('module\\.exports\\s*=\\s*\\{[^}]*\\b' + n + '\\b').test(src));
    if (missing.length) {
      console.error('[sync] ✗ ' + path.basename(t.dir) + ' 依赖的导出缺失：' + missing.join(', '));
      process.exit(1);
    }
    ok++;
  }

  console.log(ok ? '[sync] 完成，共同步 ' + ok + ' 个云函数。' : '[sync] 没有可同步的目标。');
}

main();
