# 空天科协资料站

电子科技大学航空航天科技协会的资料与活动网站，由协会同学共同维护。当前是学生个人发起的项目，不是学校官方门户。

[访问网站](https://roughguyy.github.io/aero-association-site/) · [参与维护](CONTRIBUTING.md) · [内容编辑说明](网站内容/README.md)

## 从哪里修改

| 位置 | 用途 |
| --- | --- |
| [网站内容](网站内容/README.md) | 首页、新人指南、技术资料、项目、新闻和通知的正式文字 |
| [发布资源](发布资源/README.md) | 网站正在使用的照片、视频、字体和附件 |
| [frontend](frontend) | 页面结构、样式与交互 |
| [aero_association_agent](aero_association_agent) | 读取 Markdown/JSON 并生成公开数据的程序 |
| [build_static_site.py](build_static_site.py) | 生成可发布网站 |
| [tests](tests) | 页面结构、链接和响应式规则检查 |

原始素材、内部记录、密钥和问答后端不在公开仓库中。不要把个人 `.env`、未确认公开的照片或内部资料加入提交。

## 本地预览

需要 Python 3.12 和 Node.js 20 或更新版本：

```shell
python -m pip install -r requirements-static.txt
python build_static_site.py
python -m http.server 8000 --directory dist
```

浏览器打开 `http://127.0.0.1:8000/`。修改文案或资源后，重新运行构建命令并刷新页面。

提交前运行：

```shell
node --test tests/navigation.test.cjs tests/static-paths.test.cjs
python build_static_site.py
```

## 发布方式

成员在独立分支修改并提交 Pull Request；合并到 `main` 后，GitHub Actions 自动构建并发布到 GitHub Pages。通常几分钟后线上更新。

3D 打印示例视频为 99.66 MiB，已低于 GitHub 单文件 100 MiB 上限，但不能通过网页上传；请用 Git 克隆与推送。其他新增资源尽量保持轻量。
