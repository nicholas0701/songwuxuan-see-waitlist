# 飞书群机器人配置说明（松悟轩·see Waitlist 实时登记提醒）

代码里 `api/_core.js` 的 `pushFeishu()` 已内置，只要 Vercel 环境变量里有 `FEISHU_WEBHOOK`，每次有人登记就会往飞书群推一条消息。下面 3 步搞定。

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

- **没收到消息？** 先确认：① 环境变量名必须是 `FEISHU_WEBHOOK`（大小写敏感）；② 已经 Redeploy；③ 飞书机器人安全设置用了「自定义关键词 = 松悟轩」。看 Vercel Function 日志（Functions → 对应请求）里的 `feishu push error` 可定位。
- **不想用群机器人，想入飞书多维表？** 当前内置仅支持群机器人 Webhook。多维表方案需改 `pushFeishu` 或新增函数（README 方案 A 有说明），可作为下一步。
- **临时盘数据会丢**：`/tmp` 在 Vercel 实例重启时可能清空，仅适合预售验证期；正式留存按 README 方案 A/B/C 处理。
