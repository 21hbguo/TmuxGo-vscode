import * as vscode from 'vscode'
import { execFile } from 'child_process'
import { TmuxClient } from './tmux-client'
import { SessionTreeProvider } from './session-tree-provider'
import { SessionDetailsWebview, type SessionAction } from './session-details-webview'
import { SessionOrderManager } from './session-persistence'
import { registerCommands } from './commands'
import { SessionTreeItem, type TreeItem } from './session-tree-items'

let tmux: TmuxClient
let treeProvider: SessionTreeProvider
let detailsWebview: SessionDetailsWebview
let orderManager: SessionOrderManager
let refreshTimer: ReturnType<typeof setInterval> | undefined

export function activate(context: vscode.ExtensionContext): void {
  // 1. tmux-not-found check
  execFile('tmux', ['-V'], (err) => {
    if (err) {
      vscode.window.showWarningMessage(
        'tmux is not installed or not found in PATH. TmuxGo requires tmux to function.'
      )
      return
    }
  })

  // 2. Core services
  tmux = new TmuxClient()
  orderManager = new SessionOrderManager(context)
  treeProvider = new SessionTreeProvider(tmux)

  // 3. Register tree view
  const treeView = vscode.window.registerTreeDataProvider('tmuxgo_sessions', treeProvider)
  context.subscriptions.push(treeView)

  // 4. Register webview view provider
  detailsWebview = new SessionDetailsWebview(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SessionDetailsWebview.viewType, detailsWebview)
  )

  // 5. Tree selection change -> update webview detail panel
  context.subscriptions.push(
    (treeView as any).onDidChangeSelection?.((e: { selection: TreeItem[] }) => {
      const selected = e.selection[0]
      if (selected instanceof SessionTreeItem) {
        detailsWebview.updateSession(selected.session)
      } else {
        detailsWebview.updateSession(undefined)
      }
    }) ?? { dispose() {} }
  )

  // 6. Webview actions
  context.subscriptions.push(
    detailsWebview.onDidAction(async ({ action, session }) => {
      switch (action) {
        case 'attach':
          await vscode.commands.executeCommand('tmuxgo_vscode.attachSession', new SessionTreeItem(session, 'local'))
          break
        case 'kill':
          await vscode.commands.executeCommand('tmuxgo_vscode.killSession', new SessionTreeItem(session, 'local'))
          break
        case 'newWindow':
          await vscode.commands.executeCommand('tmuxgo_vscode.newWindow', new SessionTreeItem(session, 'local'))
          break
      }
    })
  )

  // 7. Register all commands
  registerCommands(context, tmux, treeProvider)

  // 8. Status bar
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

  // 9. Auto-refresh (reads refreshInterval from config)
  const config = vscode.workspace.getConfiguration('tmuxgo_vscode')
  const refreshInterval = config.get<number>('refreshInterval', 2000)
  treeProvider.startAutoRefresh(refreshInterval)
  context.subscriptions.push({ dispose: () => treeProvider.stopAutoRefresh() })

  // 10. React to config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('tmuxgo_vscode.refreshInterval')) {
        const newInterval = vscode.workspace.getConfiguration('tmuxgo_vscode').get<number>('refreshInterval', 2000)
        treeProvider.startAutoRefresh(newInterval)
      }
    })
  )
}

export function deactivate(): void {
  treeProvider?.dispose()
  refreshTimer && clearInterval(refreshTimer)
}
