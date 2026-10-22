# 把这个项目上传到 GitHub

这篇是写给同学的，按顺序做就行。  
项目目录：`D:\0A\project\aibuilder产品\Newdemo`

> 先说一句：这个项目是仓库作者（GitHub: `lingzhou592`）的个人项目。如果用同学的 GitHub 账号上传，请在 README 或仓库简介里写清楚作者和来源，不要改成自己的项目。最稳妥的做法是用作者自己的账号建仓库；同学可以帮忙操作，但仓库归属和署名要写对。

---

## 一、上传前先检查

### 1. 确认 `.gitignore` 生效

项目里已经有 `.gitignore`，下面这些不会上传：

- `node_modules/`（依赖，很大）
- `.next/`（构建产物）
- `.env.local`（模型密钥）
- `*.docx`（简历等私人文件）
- `resume_extracted.txt`
- `*.tsbuildinfo`

### 2. 确认没有密钥

打开项目根目录，确认没有 `.env.local`。  
如果有，先删掉，或者至少确认它不会被提交。

### 3. 确认没有简历文件

本地的简历文件（例如 `简历.docx`）可以留在本地，但不要上传。  
`.gitignore` 已经排除了 `*.docx`；提交前再检查一遍 `git status`。

---

## 最省事：用 VS Code 直接发布（推荐）

既然 GitHub 已经在这台电脑登录，直接用 VS Code 的 Source Control 最省事，不用手动建仓库，也不用 Personal Access Token。

### 1. 用 VS Code 打开项目文件夹

VS Code → **File → Open Folder**，选择：

```text
D:\0A\project\aibuilder产品\Newdemo
```

如果 VS Code 已经打开这个文件夹，直接看下一步。

### 2. 初始化 Git 仓库

左侧点 **Source Control** 图标（分支形状），点 **Initialize Repository**。

初始化后，左侧会出现 **Changes** 列表。这里应该只有源代码、README、docs、配置等文件，**不应该有**：

- `node_modules`
- `.next`
- `.env.local`
- 简历文件（例如 `简历.docx`）

如果看到了这些，先不要提交，检查项目根目录的 `.gitignore` 是否存在、是否生效。

### 3. 暂存并提交

1. 点 Changes 右侧的 **+**（Stage All Changes）。
2. 在提交信息框里写：

```text
feat: 有据文旅营销内容工作台
```

3. 点 **Commit**（对勾按钮）。

### 4. 发布到 GitHub

提交后，Source Control 顶部会出现 **Publish Branch**（云朵/上传图标）。

1. 点 **Publish Branch**。
2. 选择 **Publish to GitHub public repository** 或 **Publish to GitHub private repository**。
   - 想给面试官看：public
   - 只想给同学看：private
3. 如果弹出 GitHub 登录/授权，按提示在浏览器里点 **Authorize**。
4. 仓库名填 `youju-workbench`（或你喜欢的名字）。
5. 确认后，VS Code 会自动创建远程仓库并 push。

如果找不到 **Publish Branch**：

- 按 `Ctrl + Shift + P` 打开命令面板；
- 输入 `Publish to GitHub`；
- 选择 **GitHub: Publish to GitHub**；
- 如果提示安装 **GitHub Pull Requests and Issues** 扩展，按提示安装并登录。

### 5. 检查

打开 `https://github.com/你的用户名/youju-workbench`，确认：

- README 能显示；
- `docs/screenshots/` 图片能打开；
- 没有 `.env.local`、简历 docx、`node_modules`。

---

## 二、备用方案：在 GitHub 上新建仓库后用命令行

### 1. 在 GitHub 新建空仓库

1. 打开 https://github.com 并登录。
2. 右上角 `+` → **New repository**。
3. 填写：
   - **Repository name**：例如 `youju-workbench`
   - **Description**：有据 · 文旅营销素材生成与校验工作台
   - **Public / Private**：
     - 想给面试官看，选 **Public**；
     - 不确定或只想给同学看，选 **Private**。
   - **不要勾** “Add a README file”
   - **不要勾** “Add .gitignore”
   - **不要勾** “Choose a license”
4. 点 **Create repository**。
5. 记下页面上的仓库地址，例如：
   ```
   https://github.com/你的用户名/youju-workbench.git
   ```

> 为什么不要勾 README / .gitignore / license？  
> 项目里已经有这些文件。如果 GitHub 先帮你建一份，push 时容易冲突，还要多一步合并。

---

### 2. 命令行步骤

#### 1. 安装 Git

如果没有 Git，先装：https://git-scm.com/download/win  
装完打开 **Git Bash**，输入：

```bash
git --version
```

能看到版本号就说明装好了。

#### 2. 第一次使用 Git，先配置名字和邮箱

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

邮箱用你 GitHub 账号绑定的邮箱，或者 GitHub 的 noreply 邮箱都可以。

#### 3. 进入项目目录

```bash
cd "D:/0A/project/aibuilder产品/Newdemo"
```

> Windows 路径里有中文和空格，建议像上面这样加引号。

#### 4. 初始化仓库并检查文件

```bash
git init
git status
```

重点看 `git status` 里有没有这些东西：

- ❌ `node_modules/`
- ❌ `.next/`
- ❌ `.env.local`
- ❌ 简历文件（例如 `简历.docx`）
- ❌ `resume_extracted.txt`

如果出现了，**先不要继续**，说明 `.gitignore` 没生效，检查一下文件名和位置。

#### 5. 添加并提交

```bash
git add .
git status
```

再看一遍 `git status`，确认没有敏感文件。  
然后提交：

```bash
git commit -m "feat: 有据文旅营销内容工作台"
```

#### 6. 连接 GitHub 仓库

把下面的地址换成你自己的仓库地址：

```bash
git branch -M main
git remote add origin https://github.com/你的用户名/youju-workbench.git
git push -u origin main
```

#### 7. 如果 push 时让你输入密码

GitHub 现在不能用账号密码 push，要用 **Personal Access Token**。

1. GitHub 右上角头像 → **Settings**
2. 左侧最下面 → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token (classic)**
5. Note 随便写，比如 `upload-demo`
6. Expiration 选 7 天或 30 天
7. 勾选 **repo** 权限
8. 点 **Generate token**
9. 复制生成的 token（只显示一次）

push 时：

- Username：你的 GitHub 用户名
- Password：粘贴刚才的 token（不是账号密码）

---

## 三、另一种选择：GitHub Desktop

如果同学觉得命令行麻烦，可以用 GitHub Desktop：

1. 下载安装：https://desktop.github.com/
2. 登录 GitHub 账号。
3. 菜单 **File → Add local repository**。
4. 选择项目目录：
   ```
   D:\0A\project\aibuilder产品\Newdemo
   ```
5. 如果提示不是 Git 仓库，点 **create a repository**。
6. 左下角写提交信息，例如 `feat: 有据文旅营销内容工作台`，点 **Commit to main**。
7. 右上角点 **Publish repository**。
8. 选择 Public 或 Private，点 **Publish repository**。

上传前同样要确认：`node_modules`、`.next`、`.env.local`、简历 docx 没有被勾选。

---

## 四、上传后检查

打开 GitHub 仓库页面，确认：

- README 能正常显示；
- `docs/screenshots/` 里的图片能打开；
- 没有 `.env.local`；
- 没有简历 docx；
- 没有 `node_modules`；
- 文件列表里有 `src/`、`package.json`、`README.md`、`docs/`。

如果 README 里的图片不显示，检查图片路径大小写和文件是否真的上传了。

---

## 五、常见问题

### 1. `remote origin already exists`

说明已经添加过远程地址，改一下：

```bash
git remote set-url origin https://github.com/你的用户名/youju-workbench.git
```

或者先删掉再添加：

```bash
git remote remove origin
git remote add origin https://github.com/你的用户名/youju-workbench.git
```

### 2. `failed to push some refs`

如果建仓库时勾了 README，远程会先有一个提交。先拉一下再推：

```bash
git pull --rebase origin main
git push -u origin main
```

### 3. 不小心把 `node_modules` 提交了

```bash
git rm -r --cached node_modules .next
git commit -m "chore: remove build artifacts"
git push
```

然后确认 `.gitignore` 里有 `node_modules/` 和 `.next/`。

### 4. 认证失败 / `Authentication failed`

- 确认用户名是 GitHub 用户名；
- 密码位置粘贴的是 Personal Access Token；
- token 过期了就重新生成一个；
- 或者直接用 GitHub Desktop 登录。

### 5. 中文路径或文件名乱码

用 Git Bash，路径加引号：

```bash
cd "D:/0A/project/aibuilder产品/Newdemo"
```

提交信息用中文一般没问题；如果终端显示乱码，不影响仓库内容。

### 6. `LF will be replaced by CRLF`

这是 Windows 换行符提示，可以忽略。

---

## 六、最后再提醒一次

- 不要上传 `.env.local` 和任何 `sk-...` 密钥；
- 不要上传简历 docx、手机号、邮箱等个人信息；
- 如果使用同学的 GitHub 账号，请在 README 或仓库简介里写清楚：
  - 项目作者：`lingzhou592`
  - 仓库用途：例如“帮同学演示/备份”
- 最稳妥的方式：用作者自己的 GitHub 账号创建仓库，同学只负责协助操作。
