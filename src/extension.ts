import * as vscode from 'vscode'
import { TmuxClient } from './tmux-client'
import { SessionTreeProvider } from './session-tree-provider'
import { registerCommands } from './commands'

let tmux: TmuxClient
let treeProvider: SessionTreeProvider

export function activate(context: vscode.ExtensionContext): void {
  tmux = new TmuxClient()
  treeProvider = new SessionTreeProvider(tmux)

  // Register tree view in sidebar
  const treeView = vscode.window.registerTreeDataProvider('tmuxgo_sessions', treeProvider)
  context.subscriptions.push(treeView)

  // Register all commands
  registerCommands(context, tmux, treeProvider)

  // Start auto-refresh
  treeProvider.startAutoRefresh(2000)
  context.subscriptions.push({ dispose: () => treeProvider.stopAutoRefresh() })

  // Status bar
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  statusItem.command = 'tmuxgo_vscode.attachSession'
  statusItem.tooltip = 'TmuxGo: Click to attach session'
  context.subscriptions.push(statusItem)

  const updateStatus = async () => {
    try {
      const sessions = await tmux.listSessions()
      if (sessions.length > 0) {
        const active = sessions.find(s => s.attached > 0) || sessions[0]
        statusItem.text = `$(terminal) tmux: ${active.name}`
        statusItem.show()
      } else {
        statusItem.text = '$(terminal) tmux: none'
        statusItem.show()
      }
    } catch {
      statusItem.text = '$(terminal) tmux: not running'
      statusItem.show()
    }
  }

  updateStatus()
  const statusTimer = setInterval(updateStatus, 5000)
  context.subscriptions.push({ dispose: () => clearInterval(statusTimer) })
}

export function deactivate(): void {
  treeProvider?.dispose()
}
