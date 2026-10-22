# 站内导览

Cloudflare Workers 免费套餐运行，SQLite Durable Object 记录全站每日调用计数。不需要自购服务器。DeepSeek API 的调用费用单独计算。

## 本地与云端

- `python scripts/preview_site.py`：沿用本机 `.env` 的 DeepSeek 配置，自动更新本地网站。
- `worker.mjs`：线上接口，只推荐公开目录中的页面总入口，同一页不拆成多个章节结果，标题与链接由程序校验。
- `wrangler.jsonc`：账号、来源限制、模型和每日额度。默认北京时间每天最多 100 次 DeepSeek 请求；同一访问地址每分钟最多 6 次。失败的模型调用也占用日额度；固定入口规则与缓存命中不调用模型。
- `generated/catalog.json`：部署时从 Markdown 生成，不手动编辑，不包含内部资料或密钥。网站内容更新后，重新部署导览以同步目录。

## 入口与稳定性

`网站内容/站点结构.json` 中路线节点的 `match` 维护固定入口规则。明确的机型入门需求直接返回对应总览，不经过模型；具体模拟器、制作或首飞问题仍交给模型选页面。结果标题与简介均取自页面元数据，不再生成说明性开场白。

其他问题使用低随机性设置和 24 小时缓存；缓存键包含目录、提示词、模型及规范化问题的哈希，不保存原问题。云端缓存按 Cloudflare 节点分布，可能提前失效，不保证所有时间、所有不同问法完全一致。更新目录后自动使用新缓存键。本地 Python 回退缓存最多 256 条。

## 部署

在本目录安装锁定依赖，然后运行：

```powershell
./run-wrangler.ps1 login --browser=false --scopes account:read user:read workers_scripts:write
npm run check
./run-wrangler.ps1 deploy
```

授权时由账号持有人在浏览器完成。只保持 Workers Free，不开通付费套餐。首次部署会建立 SQLite Durable Object 命名空间，用于持久化日限额；不存储问题与访问者地址。

在 Worker 的 Settings → Variables and Secrets 中添加 **Secret** 类型的 `DEEPSEEK_API_KEY`。不要把它放进普通变量、网页代码或 GitHub 仓库。也可以通过 Wrangler 的 secret 命令以标准输入上传，不在命令行参数中写密钥。

当前地址：`https://aero-association-guide.aero-association-guide.workers.dev/api/guide`。

部署后用 `/health` 检查接通状态，用网站真实界面验证 `/api/guide`。仅允许配置的官网和本地来源调用。

## 连接网页

将 GitHub 仓库变量 `AERO_GUIDE_API_URL` 设置为部署后的 `https://<worker地址>/api/guide`。构建脚本只把这个公开接口地址写入页面；密钥留在 Cloudflare Secret 中。发布工作流读取该变量后重新构建网站。

尚未设置接口地址时，正式构建会显示“站内导览暂未开放”，不会暴露本机配置。本地预览默认使用本地接口；本机 `.env` 中设置 `AERO_GUIDE_API_URL` 后可直接体验云端接口。

## 检查

```powershell
python build_catalog.py
node --test ../tests/guide-worker.test.mjs
./run-wrangler.ps1 deploy --dry-run
```

免费平台额度耗尽时服务受限，不自动升级套餐。每日 100 次是调用次数上限，不是固定金额预算；还应在 DeepSeek 账号中管理充值与余额。

Windows 使用 `run-wrangler.ps1`，将授权配置、日志和临时文件保存在 `D:\Codex\Workspaces\aero-guide-tools`，不写入仓库。首次安装使用 `npm install --cache D:/Codex/Workspaces/aero-guide-tools/npm-cache`。

## 层级索引

`网站内容/站点结构.json` 同时驱动官网导航与导览。`build_catalog.py` 读取文章标题／摘要、树形归属和已公开的活动／项目／机型记录，生成 `generated/catalog.json`。模型只接收树的标题、用途和 ID，不读取正文、章节标题或内部资料。返回 ID 由服务端解析为真实地址；同页只保留一个结果，祖先目录与下级不同时显示。

改正文保存后，本地预览自动更新；改导览结构或摘要后，还需重新部署云函数才会更新线上导览。主站发布仍为单独操作。
