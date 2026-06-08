# TmuxGo for VS Code

在 VS Code 侧边栏管理 tmux 会话的扩展。

基于 [vscode-tmux-manager](https://github.com/ZeroRegister/vscode-tmux-manager) by ZeroRegister 改造。

## 安装

**下载 VSIX 安装包：**

[📥 下载最新版本](https://github.com/21hbguo/TmuxGo-vscode/releases/latest/download/tmuxgo-vscode-0.1.0.vsix)

```bash
code --install-extension tmuxgo-vscode-0.1.0.vsix
```

**从源码构建：**

```bash
git clone https://github.com/21hbguo/TmuxGo-vscode.git
cd TmuxGo-vscode
npm install && npm run compile && npm run package
code --install-extension tmuxgo-vscode-0.1.0.vsix
```

## 功能

- **Session Explorer 侧边栏** — Session > Window > Pane 三级树视图
- **一键 Attach** — 点击 session 直接在 VS Code 终端中 attach
- **Session CRUD** — 创建、重命名、删除会话
- **窗口管理** — 新建、重命名、杀死窗口
- **面板管理** — 水平/垂直拆分、杀死面板
- **智能终端复用** — 已有终端时直接切换，不重复创建
- **Auto Refresh** — 可开关的自动刷新

## 命令

所有操作可通过 `Ctrl+Shift+P` 搜索 "TmuxGo" 访问，或右键树节点操作。

## 致谢

- [vscode-tmux-manager](https://marketplace.visualstudio.com/items?itemName=ZeroRegister.vscode-tmux-manager) by ZeroRegister — 核心代码来源

## License

MIT
