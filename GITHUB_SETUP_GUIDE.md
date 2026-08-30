# 获取 A（仓库地址）和 B（认证方式）的完整指引

> 目标：把本地 `songwuxuan-see-waitlist` 仓库推送到 GitHub，然后在 Vercel 部署。

---

## 一、获取 A：GitHub 仓库地址

### 步骤 1：在 GitHub 创建空仓库

1. 打开浏览器，访问 https://github.com/new
2. **Repository name** 填：`songwuxuan-see-waitlist`
3. **Description**（可选）：`松悟轩·see 预售 waitlist 落地页`
4. **Visibility**：选 **Public**（免费，Vercel 导入无限制）或 **Private**（也免费，但 Vercel 免费版对私有仓库有功能限制，建议 Public）
5. **不要勾选以下任何一项**（保持空仓库，避免与本地 commit 冲突）：
   - [ ] Add a README file
   - [ ] Add .gitignore
   - [ ] Choose a license
6. 点击 **Create repository**

### 步骤 2：复制仓库地址

创建成功后，GitHub 会显示一个页面，上面有类似这样的地址：

```
# SSH 地址（推荐，如果你后续会频繁推送）
git@github.com:你的用户名/songwuxuan-see-waitlist.git

# HTTPS 地址（简单，但每次推送可能需要输密码/Token）
https://github.com/你的用户名/songwuxuan-see-waitlist.git
```

**复制其中一个地址**，这就是 **A**。

> 💡 不知道选 SSH 还是 HTTPS？
> - 如果你打算长期维护这个项目，**选 SSH**（步骤 3 会教你配置）
> - 如果只是推一次就完事，**选 HTTPS** 更简单

---

## 二、获取 B：认证方式

GitHub 从 2021 年起不再支持密码直接推送，必须用 **Personal Access Token (PAT)** 或 **SSH Key**。下面两种方案二选一。

---

### 方案一：SSH Key（推荐，长期好用）

配置一次，后续推送无需再输密码。

#### 步骤 1：检查是否已有 SSH Key

打开终端（Terminal），执行：

```bash
ls ~/.ssh/
```

如果看到 `id_rsa.pub` 或 `id_ed25519.pub`，说明已有 SSH Key，跳到**步骤 3**。

#### 步骤 2：生成新的 SSH Key（如果没有）

```bash
ssh-keygen -t ed25519 -C "你的邮箱@example.com"
```

按提示操作：
- 保存路径：直接回车（默认 `~/.ssh/id_ed25519`）
- 密码：直接回车（不设密码，方便使用）或设一个

生成后，把公钥内容复制到剪贴板：

```bash
cat ~/.ssh/id_ed25519.pub | pbcopy
```

（如果上面命令报错，用 `cat ~/.ssh/id_ed25519.pub` 手动复制输出内容）

#### 步骤 3：把公钥添加到 GitHub

1. 打开 https://github.com/settings/keys
2. 点击 **New SSH key**
3. Title 填：`MacBook Pro`（或你的设备名）
4. Key 粘贴刚才复制的公钥内容
5. 点击 **Add SSH key**

#### 步骤 4：验证 SSH 连接

```bash
ssh -T git@github.com
```

看到 `Hi 你的用户名! You've successfully authenticated...` 即成功。

#### 步骤 5：使用 SSH 地址推送

把 **A**（SSH 地址）给我，例如：

```
git@github.com:niclawyer/songwuxuan-see-waitlist.git
```

---

### 方案二：Personal Access Token（HTTPS 方式）

不想配 SSH，或者只是临时推一次，用这个。

#### 步骤 1：生成 Token

1. 打开 https://github.com/settings/tokens
2. 点击右上角 **Generate new token (classic)**
3. 可能需要输入 GitHub 密码验证
4. 填写：
   - **Note**：`Vercel Deploy Token`
   - **Expiration**：选 **No expiration**（或 90 天）
   - **Scopes**：勾选 **repo**（完整仓库读写权限）
5. 点击 **Generate token**
6. **立刻复制生成的 Token**（页面刷新后看不到，只能重新生成）

Token 看起来像这样：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 步骤 2：使用 HTTPS 地址 + Token 推送

把 **A**（HTTPS 地址）和 **Token** 给我，例如：

```
# 仓库地址
https://github.com/niclawyer/songwuxuan-see-waitlist.git

# Token
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **安全提醒**：Token 是敏感信息，不要发到公开群聊。可以私聊发我，或你自己执行推送命令。

---

## 三、给我信息，我来推

### 如果你选了 SSH（方案一）

给我：
```
A = git@github.com:你的用户名/songwuxuan-see-waitlist.git
B = SSH（已配置）
```

我执行：
```bash
git remote add origin git@github.com:你的用户名/songwuxuan-see-waitlist.git
git push -u origin main
```

### 如果你选了 HTTPS + Token（方案二）

给我：
```
A = https://github.com/你的用户名/songwuxuan-see-waitlist.git
B = ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

我执行：
```bash
git remote add origin https://你的用户名:ghp_xxxxxxxxxx@github.com/你的用户名/songwuxuan-see-waitlist.git
git push -u origin main
```

---

## 四、推完后：Vercel 部署

1. 打开 https://vercel.com/new
2. 用 GitHub 登录 → Import Git Repository → 选 `songwuxuan-see-waitlist`
3. Framework Preset 选 **Other**
4. 点击 **Deploy**
5. 等 1–2 分钟，拿到 `xxx.vercel.app` 域名

---

## 五、收数据：配置飞书机器人

按 `FEISHU_SETUP.md` 操作：
1. 飞书群 → 群机器人 → 自定义机器人 → 获取 Webhook URL
2. Vercel 项目 → Settings → Environment Variables → 新增 `FEISHU_WEBHOOK`
3. Redeploy

---

## 快速决策表

| 你的情况 | 推荐方案 | 需要给我 |
|---------|---------|---------|
| 经常推代码，有 GitHub 账号 | SSH | 仓库 SSH 地址 |
| 偶尔推一次，不想配 SSH | HTTPS + Token | 仓库 HTTPS 地址 + Token |
| 没有 GitHub 账号 | 先注册 github.com | 注册完再走上面任一种 |

---

**现在请告诉我：**
1. 你的 GitHub 用户名是什么？
2. 你想用 SSH 还是 HTTPS + Token？

我立刻帮你推。
