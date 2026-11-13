**评论区层级**

- 帖子楼层与作品评论改为按回复关系缩进展示：接口返回扁平列表，客户端按
  `replyToPostNumber` / `replyToCommentNumber` 自行构树
- 最多渲染 3 层，更深的回复收拢到第 3 层并标注引用对象
- 每条回复显示被回复内容的摘要行（最多两行），找不到时标注「该楼层不可见」
- 同一父节点下超过 3 条回复时折叠为「展开 N 条回复」，折叠时仍显示前 2 条
- 楼主楼层加「楼主」徽标；回复楼主的楼层正确归到首楼之下
- 父节点缺失、分页截断、环状引用等异常数据均按根节点兜底，不丢回复

## 安装

### 浏览器扩展

1. 下载 `PickCat-WinUI3-extension.zip` 并解压到固定目录
   （**不要**放在 `C:\Program Files`，会报 `rules.json: Internal error while parsing rules`）
2. 打开 `chrome://extensions`，开启右上角「开发者模式」
3. 点「加载已解压的扩展程序」，选择解压出来的文件夹
4. 打开 <https://pickcat.dao3.fun/>

### Windows 桌面版

下载 `PickCatWinUI3-Setup-*.msi` 直接安装，不需要管理员权限，开始菜单会有条目，
可在「设置 → 应用」中卸载。

完整历史见 [CHANGELOG.md](https://github.com/ttummc/pickcat-winui3/blob/main/CHANGELOG.md)。

> 只在 `pickcat.dao3.fun` 生效。停用扩展后原站界面立刻恢复。
