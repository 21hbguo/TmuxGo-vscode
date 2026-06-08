# TmuxGo for VS Code

在 VS Code 中管理 tmux 会话的扩展。

## 功能

- **Session Explorer 侧边栏** — Session > Window > Pane 三级树视图
- **集成终端 Attach** — Pseudoterminal 桥接 tmux attach 到 VS Code 终端
- **Session CRUD** — 创建、重命名、删除会话
- **窗口/面板管理** — 新建、拆分、关闭、缩放
- **面板内容捕获** — capture-pane 打开为只读编辑器
- **状态栏** — 显示当前 tmux 会话名称

## 快速开始

```bash
npm install
npm run compile
```

按 `F5` 启动 Extension Development Host 调试。

## 命令

| 命令 | 说明 |
|------|------|
| `TmuxGo: Attach Session` | 连接到 tmux 会话 |
| `TmuxGo: New Session` | 创建新会话 |
| `TmuxGo: Kill Session` | 终止会话 |
| `TmuxGo: Rename Session` | 重命名会话 |
| `TmuxGo: New Window` | 新建窗口 |
| `TmuxGo: Split Horizontal` | 水平拆分面板 |
| `TmuxGo: Split Vertical` | 垂直拆分面板 |
| `TmuxGo: Capture Pane` | 捕获面板内容 |

## 依赖

- `tmux` CLI 已安装
- `node-pty` 用于终端桥接

## License

MIT
