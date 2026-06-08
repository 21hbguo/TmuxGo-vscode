# TmuxGo for VS Code

在 VS Code 中管理 tmux 会话的扩展。

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
./build.sh
code --install-extension tmuxgo-vscode-0.1.0.vsix
```

## 功能

- **Session Explorer 侧边栏** — Session > Window > Pane 三级树视图
- **集成终端 Attach** — tmux attach 到 VS Code 终端（exclusive 模式，不共享尺寸）
- **Session CRUD** — 创建、重命名、删除会话
- **窗口/面板管理** — 新建、拆分、关闭、缩放、切换
- **会话模板** — 预定义模板（Default / Development / Monitoring / Side by Side）
- **批量操作** — 多选批量删除会话
- **收藏夹** — 收藏常用会话，持久化排序
- **面板内容捕获** — capture-pane 打开为只读编辑器
- **状态栏** — 显示当前 tmux 会话名称
- **快捷键** — 可自定义的键盘快捷键

## 快捷键

| 快捷键 | 命令 |
|--------|------|
| `Ctrl+Shift+T` | Attach Session |
| `Ctrl+Shift+N` | New Session |
| `Ctrl+Shift+K` | Kill Session |
| `Ctrl+Shift+W` | Switch Window |
| `Ctrl+Shift+\` | Split Vertical |
| `Ctrl+Shift+-` | Split Horizontal |
| `Ctrl+Shift+Z` | Toggle Zoom |
| `Ctrl+Shift+C` | Capture Pane |
| `Ctrl+Shift+E` | Collapse All |

## 命令面板

所有操作均可通过 `Ctrl+Shift+P` 搜索 "TmuxGo" 访问。

## 依赖

- `tmux` CLI 已安装
- `node-pty` 用于终端桥接（自动编译）

## License

MIT
