**「DSH 定制」改为对话式**

- 界面改成与 DSH 本体一致的对话形式：左侧会话列表，右侧消息流，底部输入框
- 每个会话拥有独立工作区目录（`%APPDATA%\PickCat\workspaces\<id>`），内核以该目录
  为工作目录运行，文件互不干扰
- 会话通过内核的 session id 续接，支持多轮上下文
- 会话列表、标题与工作区记录在 `%APPDATA%\PickCat\chats.json`

**密钥配置**

- 新增首次使用引导：填入 DeepSeek API 密钥后即可对话
- 密钥保存在 `%APPDATA%\PickCat\api-key.txt`，仅通过 `DEEPSEEK_API_KEY`
  环境变量传给内核进程，不写入日志
- 密钥只写不回显，页面仅显示「已配置」状态

**修复**

- `FileVersion` 固定为 1.0.0.0，导致 MSI 升级时判定文件未变更而跳过覆盖；
  改为跟随 `<Version>`

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
