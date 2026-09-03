# 飞书群机器人配置说明（松悟轩·see Waitlist 实时登记提醒）

代码里 `api/_core.js` 的 `pushFeishu()` 已内置，只要 Vercel 环境变量里有 `FEISHU_WEBHOOK`，每次有人登记就会往飞书群推一条消息。下面 3 步搞定。

---

## ⚠️ 先说清楚：这不是可选项，是数据的唯一可靠出口

Vercel 的 Serverless 函数**没有持久磁盘**。代码里的 `/tmp` 落盘是临时副本：

- 函数实例被回收（几分钟无流量就会）→ 数据**直接消失**
- 多个实例并发 → 各写各的，**互不合并**
- 你**没有任何入口**能登录进去翻这些文件

**结论：不配飞书，用户每提交一次，你就永久丢一个客户，而且页面照样显示"登记成功"——你完全察觉不到。**

配好飞书后，每一条登记都会实时推到群里，这才是真正拿得住的名单。请把这一步当作上线前的必做项。

> 代码已做兜底：万一飞书没配或推送失败，会输出 `[SIGNUP_UNDELIVERED]` 日志（Vercel Logs 保留 7 天），可事后捞回。但这是**补救**，不是依赖。

---

## 第 1 步：在飞书建一个群机器人，拿到 Webhook

1. 打开飞书，进入你想接收提醒的**群**（建议新建一个「松悟轩·see 登记提醒」群）。
2. 群设置 → **群机器人** → **添加机器人** → 选择 **自定义机器人（ incoming webhook ）**。
3. 给机器人起个名字（如「Waitlist 登记提醒」），安全设置这里**先选「自定义关键词」并填 `松悟轩`**（代码推送文本含此关键词，可绕过校验；也可选签名校验但更麻烦，新手先用关键词即可）。
4. 点击 **添加** 后，飞书会给出一条形如：
   ```
   https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
   **复制这条完整 URL**，这就是 `FEISHU_WEBHOOK` 的值。

> ⚠️ 注意：安全设置若选了「签名校验」，代码需要额外算签名，当前内置版本不支持。保持「自定义关键词 = 松悟轩」最省事。

---

## 第 2 步：把 Webhook 填进 Vercel 环境变量

1. 打开 https://vercel.com → 进入你的 `songwuxuan-see-waitlist` 项目。
2. **Settings → Environment Variables**（环境变量）。
3. 新增一条：
   - **Name**：`FEISHU_WEBHOOK`
   - **Value**：粘贴第 1 步复制的那条 Webhook URL
   - **Environment**：勾选 `Production`（也可同时勾 `Preview` / `Development`）
4. 保存。

---

## 第 3 步：重新部署使其生效

环境变量改动需要**重新触发一次部署**才会注入：

- 方式 A：在 Vercel 项目页 **Deployments → 最新一次 → ⋯ → Redeploy**。
- 方式 B：改一行代码 push 上去，自动触发新部署。

部署完成后，在落地页填一次表单测试，飞书群里应立刻收到：
```
【松悟轩·see 新登记】
姓名：张三
身份：执业律师（3–10 年）
手机：138xxxx
微信：zhangsan_wx
领域：公司法
意向：增长中台
留言：-
```

---

## 常见问题

- **没收到消息？** 先确认：① 环境变量名必须是 `FEISHU_WEBHOOK`（大小写敏感）；② 已经 Redeploy；③ 飞书机器人安全设置用了「自定义关键词 = 松悟轩」。去 Vercel 项目 → **Functions** 日志里搜 `[SIGNUP_UNDELIVERED]` 或 `[ALERT]`，会直接告诉你失败原因（未配置 / HTTP 错误 / 飞书业务码错误）。
- **飞书机器人有频率限制吗？** 有，每个机器人每分钟约 20 条。预售登记量通常远低于此；若真被限流，代码会识别飞书返回的业务码并记入 `[SIGNUP_UNDELIVERED]` 日志，不会假装成功。
- **临时盘数据会丢**：见开头说明，`/tmp` 不可靠，正式留存以飞书为准。
- **想入飞书多维表（结构化名单）？** 当前内置仅支持群机器人 Webhook。多维表方案需新增 `app_id` / `app_secret` 并改造推送逻辑，可作为下一步（README 方案 A 有说明）。

---

## 附：在线导出接口 `/api/export`（可选）

除了飞书，还提供了一个随时拉名单的接口，方便你核对或补漏。

**第 1 步**：Vercel → Settings → Environment Variables → 新增 `ADMIN_TOKEN`，值自己定一个足够长的随机串（例如用密码管理器生成 20 位）。

**第 2 步**：Redeploy 后，浏览器直接打开（把 `你的域名` 和 `你的TOKEN` 换成真实值）：

```
https://你的域名.vercel.app/api/export?token=你的TOKEN
```

返回 JSON，含 `count` 与 `data` 数组。要 Excel 可直接打开的格式，加 `&format=csv`：

```
https://你的域名.vercel.app/api/export?token=你的TOKEN&format=csv
```

> CSV 已带 UTF-8 BOM，Excel 打开中文不会乱码。

**注意**：此接口读的是 `/tmp` 临时副本，**不保证完整**——只是补漏用。完整名单仍以飞书群消息为准。
未配置 `ADMIN_TOKEN` 时接口返回 503，即默认关闭，无泄露风险。
