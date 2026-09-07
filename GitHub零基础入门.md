# GitHub 零基础入门

这份说明写给第一次参与网站维护的同学。先不用学习命令行，也不必一次弄懂 Git 的全部概念。

如果只是发现文字、日期或链接需要修改，优先使用下面的“网页修改”。需要经常维护图片、页面样式或程序时，再使用 GitHub Desktop 和 VS Code。

## 先理解这几个词

| 名称 | 在这个项目里的意思 |
| --- | --- |
| 仓库（Repository） | 网站的文件夹，以及每次修改的历史记录 |
| `main` | 已确认、用于发布网站的主版本 |
| 分支（Branch） | 从主版本复制出的一条安全修改线，不直接影响当前网站 |
| 提交（Commit） | 给当前修改拍一张带说明的快照 |
| 推送（Push） | 把电脑上的提交上传到 GitHub |
| Pull Request（PR） | 请求把分支里的修改合并进 `main`，也是审核和讨论的地方 |
| 检查（Checks） | GitHub 自动检查页面、链接和构建是否正常 |
| 合并（Merge） | 审核通过后把修改纳入 `main`；随后网站会自动重新发布 |

最重要的区别：

> 在 VS Code 中按“保存”只改变自己电脑里的文件；Commit 记录修改；Push 才上传到 GitHub；PR 合并到 `main` 后，线上网站才会更新。

整个过程可以理解为：

`修改内容 → 提交 → 上传分支 → 发起 PR → 审核合并 → 自动上线`

## 方法一：只改少量文字，直接用网页

这是第一次参与时最省事的方式，不需要安装软件。

1. 注册并登录 GitHub，打开 [本项目仓库](https://github.com/RoughGuyy/aero-association-site)。
2. 进入 [网站内容](网站内容/README.md)，根据说明找到要修改的文件。
3. 打开文件，点击右上角的铅笔图标。
4. 如果 GitHub 提示先创建 Fork，选择创建。Fork 是这个仓库在你账号下的一份协作副本，不会破坏正式网站。
5. 修改内容，并使用 `Preview` 检查 Markdown 的显示效果。
6. 点击 `Commit changes...`，用一句话说明改动，例如“修正科学营活动日期”。
7. 选择创建新分支；如果页面让你填写名称，可以写 `content/姓名-内容`，例如 `content/xiaoming-science-camp`。
8. 点击 `Propose changes`，再点击 `Create pull request`。
9. 按模板说明改了什么、资料来自哪里；涉及图片、姓名或联系方式时要特别注明。
10. 等待自动检查和负责人审核。PR 合并后，通常几分钟内会发布到网站。

网页方式适合 Markdown 和 JSON 中的小改动。编辑 JSON 时，只改引号里的文字，保留原来的引号、逗号和括号；不确定时直接在 PR 里说明。

图片、视频、大量文件或页面样式不要用网页上传。特别是现有 3D 打印视频接近 GitHub 网页上传限制，需要使用下面的桌面方式。

## 方法二：经常维护，用 GitHub Desktop（或者就直接命令行我觉得可能还方便些，可选） 和 VS Code（或者任何你熟悉的IDE）

### 第一次准备

1. 安装 [GitHub Desktop](https://desktop.github.com/download/) 和 [VS Code](https://code.visualstudio.com/)。
2. 在 GitHub Desktop 中登录自己的 GitHub 账号。
3. 打开 [项目仓库](https://github.com/RoughGuyy/aero-association-site)，选择 `Code` → `Open with GitHub Desktop`；也可以在 GitHub Desktop 中选择 `File` → `Clone repository`，粘贴仓库地址。
4. 选择电脑上的保存位置，完成 Clone。Clone 是把 GitHub 上的仓库完整复制到自己电脑。

如果你不是仓库协作者，GitHub Desktop 可能提示创建 Fork。按提示创建即可，后续仍然通过 PR 交回修改。

### 每次修改

1. 在 GitHub Desktop 中切换到 `main`，点击 `Fetch origin`；如果出现 `Pull origin`，继续点击，把别人的最新修改同步下来。
2. 点击 `Current branch` → `New branch`，新建分支，例如 `content/xiaoming-new-article`。
3. 用 VS Code 打开项目文件夹，按 [内容编辑说明](网站内容/README.md) 修改并保存。
4. 回到 GitHub Desktop，逐项查看左侧出现的修改。确认没有 `.env`、聊天记录、内部资料或无关大文件。
5. 在左下角 `Summary` 写一句修改摘要，点击 `Commit to ...`。
6. 点击 `Push origin` 上传分支。
7. 点击 `Create Pull Request`，浏览器会打开 PR 页面。填写说明并提交。
8. 如果审核中还要调整，继续在同一个分支修改、Commit、Push；原 PR 会自动更新，不要重复创建 PR。
9. 合并完成后，在 GitHub Desktop 中切回 `main`，再次 `Fetch/Pull`，再开始下一项工作。

## 在这个项目里，常见内容改哪里

- 改首页、栏目简介或教程文字：先看 [网站内容](网站内容/README.md)。
- 新增新闻、通知或项目记录：复制相应目录中的 `_template.md`，不要直接改模板。
- 新增官网使用的照片、附件或字体：放入 [发布资源](发布资源/README.md) 规定的位置。
- 修改排版、颜色或手机适配：修改 `frontend`，并在 PR 中附电脑端和手机端截图。

新记录应先保持 `status: draft`。资料和配图确认后，再改成 `status: published` 与 `visibility: public`。不要随意修改既有文章的 `id`，否则旧链接会失效。

## 哪些事情不要做

- 不要把账号密码、访问令牌、`.env` 或密钥发给别人，也不要提交到仓库。
- 不要把未经确认可公开的原始照片、聊天记录或内部资料上传。
- 不要为了省事把整个电脑文件夹拖进仓库，也不要一次提交所有未检查的文件。
- 不要直接覆盖别人的改动；开始前先 Fetch/Pull，自己的工作放在新分支。
- 检查变红、出现合并冲突或看不懂提示时，不要强制合并或强制推送。把页面链接或截图发给维护者即可。

## 常见问题

### 我保存了文件，为什么网站没变化？

先检查修改是否已经 Commit、Push，并创建了 PR。只有 PR 合并到 `main`，自动发布成功后，线上网站才会变化。

### PR 中有红色叉号怎么办？

先不要合并。打开 `Checks` 查看是哪项失败，把错误页面链接或截图发给维护者。很多时候只是 JSON 少了逗号、文件名不符或链接写错。

### 出现 Merge conflict 怎么办？

这表示你和别人改了同一处内容。先停止操作，把 PR 链接发给维护者一起处理；不要使用 Force push。

### PR 已合并，手机上还是旧页面？

发布通常需要几分钟。稍后刷新；微信等内置浏览器可能保留缓存，可以关闭页面后重新打开，或使用系统浏览器再检查。

### 我不确定该改哪个文件怎么办？

在仓库的 `Issues` 页面新建一条问题，写清要修改的内容、来源和配图；也可以先把材料交给熟悉项目的同学，不必为了一个小改动先学完整套工具。

## 权限怎么安排

仓库是公开的，任何有 GitHub 账号的人都可以通过 Fork 提交 PR，不需要共享账号。经常维护网站的成员可以把自己的 GitHub 用户名发给仓库负责人，由负责人单独邀请为协作者。

即使有协作者权限，也统一使用分支和 PR。`main` 已设置审核与自动检查，避免一次误操作直接影响线上网站。

## 官方帮助

- [在 GitHub 网页中编辑文件](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files)
- [创建 Pull Request](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request)
- [安装 GitHub Desktop](https://docs.github.com/en/desktop/installing-and-authenticating-to-github-desktop/installing-github-desktop)
- [用 GitHub Desktop 克隆仓库](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop)
