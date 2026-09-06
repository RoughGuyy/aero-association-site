# 空天科协资料站

同学个人制作的协会资料与活动网站，不是学校官方门户。

## 修改内容

在「网站内容」中按栏目修改 Markdown 或 JSON；正在使用的图片、视频和附件位于「发布资源」。提交到 `main` 后，GitHub Actions 自动构建并发布，通常需要等待几分钟。

本仓库只包含静态网站需要的文件，不包含问答服务、密钥、原始素材库和内部资料。

## 本地构建

使用 Python 3.12，安装 `python-dotenv` 后运行 `python build_static_site.py`，生成的网页在 `dist`。可运行 `python -m http.server 8000 --directory dist` 预览。

首次发布在仓库 Settings → Pages 中选择 GitHub Actions。3D 打印视频接近 100 MiB，使用 Git 推送，不要通过网页上传。
