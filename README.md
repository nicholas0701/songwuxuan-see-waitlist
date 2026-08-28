# 松悟轩·see · 预售 Waitlist 落地页

面向执业律师的 **AI 合规获客增长中台** 预售意向收集页。品牌：松悟轩（陕西稼轩律师事务所）。

> 目标：稳妥、零成本、最快上线，先收集意向客户（留资不收费），不碰支付，合规风险最低。

## 目录结构
```
songwuxuan-see-waitlist/
├── index.html              # 落地页（自包含，内联 CSS/JS，无需构建）
├── api/
│   ├── _core.js            # 校验 + 落盘 + 飞书推送（共享逻辑）
│   └── signup.js           # Vercel Serverless 入口
├── netlify/functions/
│   └── signup.js           # Netlify Function 入口
├── vercel.json             # Vercel 配置
└── README.md
```

## 字段
姓名、身份（必选）、手机号、微信号、执业领域、意向产品、留言。含 honeypot 反垃圾 + 单 IP 限频。

## 一键部署（推荐 Vercel，零成本）
1. 注册 https://vercel.com （可用 GitHub 登录）。
2. 把本目录作为新仓库推到 GitHub（或 Vercel 界面直接拖拽上传文件夹）。
3. 导入仓库后，**Framework Preset 选 "Other"**，无需构建命令，直接 Deploy。
4. 部署完得到一个 `*.vercel.app` 域名，可立即访问、转发朋友圈/律师群。

### 绑定自有域名（可选，更专业）
- 在 Vercel 项目 Settings → Domains 添加你的域名（如 `see.songwuxuan.com`）。
- 按提示在域名服务商处加一条 CNAME 记录即可，几分钟生效。

## 数据去哪了？
Serverless 临时盘 `/tmp` 在实例重启/扩容时可能清空，**仅适合预售验证期**。
正式留存请三选一（都不复杂）：

### 方案 A：飞书多维表（最省事，推荐）
1. 飞书多维表 → 右上角「...」→ 创建「API 脚本 / 自动化」→ 获取**入表 Webhook**（或自建「记录变更」机器人）。
2. 更稳妥：用飞书开放平台建一个**群机器人 Webhook**，填入 Vercel 环境变量 `FEISHU_WEBHOOK`。
3. 每次登记会在群里实时收到一条消息（含姓名/手机/微信/意向）。
> 这也是 `_core.js` 里 `pushFeishu` 已内置的能力，配了环境变量即自动生效。

### 方案 B：下载数据
本地 `vercel dev` 或函数运行后，数据会写到 `/tmp/signups.json` 与 `/tmp/signups.csv`，可临时下载导出。

### 方案 C：接数据库（长期）
把 `_core.js` 的 `appendData` 换成写入 Supabase / 腾讯云数据库（都有免费额度），适合转正式站后复用。

## 合规提醒
- 登记页已写明「提交即同意我们就上线与权益事宜与您联系」，符合告知义务。
- 收集手机号/微信号属于个人信息，建议：① 不转卖；② 上线正式产品时再二次确认授权；③ 页面加隐私说明链接（可补）。
- 不在此页直接收钱，规避支付与预售合规风险；待产品成熟再上支付（微信支付/小鹅通）。

## 本地预览
```bash
# 方式 1：Vercel CLI
npm i -g vercel && vercel dev

# 方式 2：纯静态先看页面（表单需后端，仅看 UI）
python3 -m http.server 8080   # 打开 http://localhost:8080
```

## 下一步（转正式站）
1. 积累意向 → 微信/电话回访，验证需求与付费意愿。
2. 上线正式站：复用 `songwuxuan-see-mvp` 已有能力（诊断/脚本/日历/视频/合规护栏）。
3. 接入支付（小鹅通/微信支付），把 waitlist 用户转化为训练营/订阅首批客户。
