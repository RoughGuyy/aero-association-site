# 参与维护

欢迎协会成员补充教程、活动通知、新闻记录和项目资料。所有内容会公开展示，请先核对事实、图片授权和个人信息。

## 推荐流程

1. 从 `main` 新建分支，例如 `content/science-camp` 或 `fix/mobile-hero`。
2. 按 [网站内容编辑说明](网站内容/README.md) 修改；新闻、通知和项目优先复制对应 `_template.md`。
3. 本地构建并运行检查。
4. 提交 Pull Request，简要说明改了什么、资料来源以及手机/电脑端是否检查。
5. 负责人审核并合并；合并后网站自动发布。

不熟悉 Git 的同学也可以先开 Issue，写清需要更新的内容和来源，由维护者整理。

## 内容分工

- 宣传部：活动新闻、照片说明、完整报道链接。
- 活动部：活动通知、时间地点、报名方式和联系人。
- 项目参与者：项目记录、制作经验和已验证的技术资料。
- 页面维护者：布局、样式、导航和发布流程。

## 提交前检查

```shell
python -m pip install -r requirements-static.txt
node --test tests/navigation.test.cjs tests/static-paths.test.cjs
python build_static_site.py
```

- 不提交 `.env`、账号密钥、内部记录、未公开原始素材或聊天记录。
- 新增新闻/通知时先用 `status: draft`；确认后再改为 `status: published` 和 `visibility: public`。
- 图片必须对应实际活动，填写准确的替代文字；不要拿其他年份照片凑配图。
- 不确定的事实留空或在 Pull Request 中说明，不写进正式页面。
- 不随意更改既有文章的 `id`，否则旧链接会失效。

## Pull Request 内容

请说明修改目的和栏目、资料来源、是否涉及姓名/肖像/联系方式、已完成的本地检查；页面调整时附电脑和手机截图。
