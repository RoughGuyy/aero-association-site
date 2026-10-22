# 空天科协资料站

电子科技大学航空航天科技协会的资料与活动网站，由协会同学共同维护。当前是学生个人发起的项目，不是学校官方门户。

[访问网站](https://roughguyy.github.io/aero-association-site/) · [GitHub 零基础入门](GitHub零基础入门.md) · [参与维护](CONTRIBUTING.md) · [内容编辑说明](网站内容/README.md)

## 从哪里修改

| 位置 | 用途 |
| --- | --- |
| [网站内容](网站内容/README.md) | 首页、新人指南、技术资料、机型、项目与竞赛、活动与实践的正式文字 |
| [发布资源](发布资源/README.md) | 网站正在使用的照片、视频、字体和附件 |
| [frontend](frontend) | 页面结构、样式与交互 |
| [aero_association_agent](aero_association_agent) | 读取 Markdown/JSON 并生成公开数据的程序 |
| [build_static_site.py](build_static_site.py) | 生成可发布网站 |
| [tests](tests) | 页面结构、链接和响应式规则检查 |

原始素材、内部记录和密钥不在公开仓库中。不要把个人 `.env`、未确认公开的照片或内部资料加入提交。站内导览的云函数位于 [cloudflare](cloudflare/README.md)，只索引公开网站内容。

## 项目结构

网站呈现、内容目录与导览使用同一套层级，见 [内容编辑索引](网站内容/README.md) 和 [站点结构](网站内容/站点结构.json)。修改正文找 Markdown；调整栏目、路线、课程与文章归属找站点结构；修改视觉和交互找 frontend。

公开代码按职责分开：`aero_association_agent` 读取内容，`frontend` 渲染页面，`cloudflare` 提供导览服务，`tests` 验证行为，`scripts` 是本地维护工具，`dist` 是自动生成的预览／发布结果，不直接编辑。

`source_materials`、`内部资料`、本地 `.env`、`data` 和历史辅助工具不属于官网内容来源，不参与公开索引；保留原件与本地配置。

## 本地预览

需要 Python 3.12 和 Node.js 20 或更新版本：

```shell
python -m pip install -r requirements-static.txt
python scripts/preview_site.py
```

浏览器打开 `http://127.0.0.1:8000/`。保持预览进程运行，修改网站内容、页面代码或发布资源并保存后，会自动构建和刷新浏览器。格式错误时保留上次正常预览，修正并保存即可。只绑定本机，不会自动发布官网。

提交前运行：

```shell
node --test --test-isolation=none tests/navigation.test.cjs tests/static-paths.test.cjs tests/aircraft.test.cjs
python build_static_site.py
```

## 发布方式

成员在独立分支修改并提交 Pull Request；合并到 `main` 后，GitHub Actions 自动构建并发布到 GitHub Pages。通常几分钟后线上更新。

第一次使用 GitHub 的同学先看 [GitHub 零基础入门](GitHub零基础入门.md)。少量文字可以直接在网页中修改；长期维护图片、样式或程序时，建议使用 VS Code 等IDE。

## 访问统计

网站支持 Cloudflare Web Analytics。启用后可以在 Cloudflare 后台查看访问量、访客数、访问来源、设备和地区等汇总信息，不使用 Cookie，也不收集访客个人信息。

当前站点 token 已配置在发布流程中。若以后在 Cloudflare 中重建统计站点，需要同时更新 `.github/workflows/deploy-pages.yml` 中的 `CLOUDFLARE_WEB_ANALYTICS_TOKEN`，然后重新发布。

统计从启用后开始，不能补回之前的访问。站内切换栏目和文章不会重复计数；刷新、重新打开网站或直接打开内容链接会产生新的浏览。Cloudflare 不记录网址问号后的参数，因此目前可以看整站访问情况，不能区分各栏目和文章。

3D 打印示例视频为 99.66 MiB，已低于 GitHub 单文件 100 MiB 上限，但不能通过网页上传，该问题待解决；请用 Git 克隆与推送。其他新增资源尽量保持轻量。
