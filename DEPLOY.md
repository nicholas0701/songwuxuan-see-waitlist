# 部署速查（GitHub → Vercel）

> 本机已做的事：
> - ✅ `git init` + 首条 commit 已完成（分支 `main`，7 个文件，commit `5d8840b`）
> - ✅ 飞书配置说明见 `FEISHU_SETUP.md`
> - ⏳ 仓库已就绪，只差「推送到 GitHub」这步需要你提供仓库地址

---

## 第 1 步：在 GitHub 建一个空仓库

1. 打开 https://github.com/new
2. Repository name 填：`songwuxuan-see-waitlist`
3. **不要**勾选 Initialize with README / .gitignore / License（保持空仓库，避免冲突）
4. 点 **Create repository**
5. 复制它给的地址，形如：
   - SSH：`git@github.com:<你的用户名>/songwuxuan-see-waitlist.git`
   - HTTPS：`https://github.com/<你的用户名>/songwuxuan-see-waitlist.git`

> 把上面地址发给我（或自己执行下一步）。

---

## 第 2 步：关联远程并推送

把下面 `<仓库地址>` 换成第 1 步复制的地址，在本目录执行：

```bash
cd /Users/niclawyer/WorkBuddy/Claw/songwuxuan-see-waitlist

# 关联远程（SSH 或 HTTPS 二选一）
git remote add origin <仓库地址>

# 推送（首次需按提示输入 GitHub 账号密码 / Personal Access Token）
git push -u origin main
```

> 若用 **HTTPS** 且开启了 2FA，密码处要填 **Personal Access Token**（不是登录密码）：
> GitHub → Settings → Developer settings → Personal access tokens → 勾 `repo` 权限生成。

---

## 第 3 步：Vercel 导入并部署

1. 打开 https://vercel.com/new （可用 GitHub 登录授权）
2. 选 **Import Git Repository** → 选中刚推上去的 `songwuxuan-see-waitlist`
3. Framework Preset 选 **Other**（无需构建命令）
4. Root Directory 保持默认（仓库根目录，含 `index.html` 与 `api/`）
5. 点 **Deploy**，约 1–2 分钟拿到 `*.vercel.app` 域名
6. 想收登记提醒：按 `FEISHU_SETUP.md` 配 `FEISHU_WEBHOOK` 后再 Redeploy

---

## 备选：不想建 GitHub 仓库？

Vercel 也支持**直接拖文件夹上传**：
1. 打开 https://vercel.com/new → 选 **Upload** 直接拖 `songwuxuan-see-waitlist/` 文件夹
2. 同样 Framework 选 Other → Deploy
（缺点：后续更新需重新拖，无版本历史。建议还是走 GitHub。）

---

## 本地验证（可选）

```bash
# 看页面 UI（表单需后端，仅看样式）
cd /Users/niclawyer/WorkBuddy/Claw/songwuxuan-see-waitlist
python3 -m http.server 8080   # 打开 http://localhost:8080
```
