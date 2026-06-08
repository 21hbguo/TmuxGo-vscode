import * as vscode from 'vscode'
import { TmuxClient } from './tmux-client'
import { SessionTreeProvider } from './session-tree-provider'
import { SessionPseudoterminal } from './session-pseudoterminal'
import { SessionTreeItem, WindowTreeItem, PaneTreeItem, type TreeItem } from './session-tree-items'

const attachedTerminals = new Map<string, vscode.Terminal>()

export function registerCommands(
  context: vscode.ExtensionContext,
  tmux: TmuxClient,
  treeProvider: SessionTreeProvider
): void {
  const attach = async (treeItem?: TreeItem) => {
    const sessionName = treeItem instanceof SessionTreeItem
      ? treeItem.session.name
      : await pickSession(tmux)
    if (!sessionName) return

    // Reuse existing terminal if already attached
    const existing = attachedTerminals.get(sessionName)
    if (existing) {
      existing.show()
      return
    }

    const pty = new SessionPseudoterminal(sessionName)
    const terminal = vscode.window.createTerminal({
      name: `tmux: ${sessionName}`,
      pty,
    })
    attachedTerminals.set(sessionName, terminal)
    terminal.show()

    // Clean up on close
    const disposable = vscode.window.onDidCloseTerminal(t => {
      if (t === terminal) {
        attachedTerminals.delete(sessionName)
        disposable.dispose()
        treeProvider.refresh()
      }
    })
    context.subscriptions.push(disposable)
  }

  const attachExclusive = async (treeItem?: TreeItem) => {
    const sessionName = treeItem instanceof SessionTreeItem
      ? treeItem.session.name
      : await pickSession(tmux)
    if (!sessionName) return

    const pty = new SessionPseudoterminal(sessionName, { exclusive: true })
    const terminal = vscode.window.createTerminal({
      name: `tmux: ${sessionName}`,
      pty,
    })
    attachedTerminals.set(sessionName, terminal)
    terminal.show()
    treeProvider.refresh()
  }

  const newSession = async () => {
    const name = await vscode.window.showInputBox({
      prompt: 'Session name',
      placeHolder: 'my-session',
    })
    if (!name) return

    try {
      await tmux.createSession(name)
      treeProvider.refresh()
      vscode.window.showInformationMessage(`Session "${name}" created`)
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to create session: ${err.message}`)
    }
  }

  const killSession = async (treeItem?: TreeItem) => {
    const sessionName = treeItem instanceof SessionTreeItem
      ? treeItem.session.name
      : await pickSession(tmux)
    if (!sessionName) return

    const confirm = await vscode.window.showWarningMessage(
      `Kill session "${sessionName}"?`,
      'Kill',
      'Cancel'
    )
    if (confirm !== 'Kill') return

    try {
      await tmux.killSession(sessionName)
      treeProvider.refresh()
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to kill session: ${err.message}`)
    }
  }

  const renameSession = async (treeItem?: TreeItem) => {
    const sessionName = treeItem instanceof SessionTreeItem
      ? treeItem.session.name
      : await pickSession(tmux)
    if (!sessionName) return

    const newName = await vscode.window.showInputBox({
      prompt: 'New session name',
      value: sessionName,
    })
    if (!newName || newName === sessionName) return

    try {
      await tmux.renameSession(sessionName, newName)
      treeProvider.refresh()
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to rename session: ${err.message}`)
    }
  }

  const newWindow = async (treeItem?: TreeItem) => {
    const sessionName = treeItem instanceof SessionTreeItem
      ? treeItem.session.name
      : treeItem instanceof WindowTreeItem
        ? treeItem.sessionName
        : await pickSession(tmux)
    if (!sessionName) return

    const name = await vscode.window.showInputBox({
      prompt: 'Window name (optional)',
      placeHolder: 'my-window',
    })

    try {
      await tmux.newWindow(sessionName, name || undefined)
      treeProvider.refresh()
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to create window: ${err.message}`)
    }
  }

  const killWindow = async (treeItem?: TreeItem) => {
    if (treeItem instanceof WindowTreeItem) {
      const target = `${treeItem.sessionName}:${treeItem.window.index}`
      try {
        await tmux.killWindow(target)
        treeProvider.refresh()
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to kill window: ${err.message}`)
      }
    }
  }

  const renameWindow = async (treeItem?: TreeItem) => {
    if (!(treeItem instanceof WindowTreeItem)) return
    const newName = await vscode.window.showInputBox({
      prompt: 'New window name',
      value: treeItem.window.name,
    })
    if (!newName || newName === treeItem.window.name) return

    const target = `${treeItem.sessionName}:${treeItem.window.index}`
    try {
      await tmux.renameWindow(target, newName)
      treeProvider.refresh()
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to rename window: ${err.message}`)
    }
  }

  const splitPane = async (direction: 'horizontal' | 'vertical', treeItem?: TreeItem) => {
    if (!(treeItem instanceof PaneTreeItem) && !(treeItem instanceof WindowTreeItem)) {
      vscode.window.showWarningMessage('Select a pane or window to split')
      return
    }
    const target = treeItem instanceof PaneTreeItem ? treeItem.target : `${treeItem.sessionName}:${treeItem.window.index}`
    try {
      await tmux.splitPane(target, direction)
      treeProvider.refresh()
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to split pane: ${err.message}`)
    }
  }

  const killPane = async (treeItem?: TreeItem) => {
    if (!(treeItem instanceof PaneTreeItem)) return
    try {
      await tmux.killPane(treeItem.target)
      treeProvider.refresh()
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to kill pane: ${err.message}`)
    }
  }

  const toggleZoom = async (treeItem?: TreeItem) => {
    if (!(treeItem instanceof PaneTreeItem)) return
    try {
      await tmux.toggleZoom(treeItem.target)
      treeProvider.refresh()
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to toggle zoom: ${err.message}`)
    }
  }

  const capturePane = async (treeItem?: TreeItem) => {
    if (!(treeItem instanceof PaneTreeItem)) {
      vscode.window.showWarningMessage('Select a pane to capture')
      return
    }
    try {
      const content = await tmux.capturePane(treeItem.target)
      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'plaintext',
      })
      await vscode.window.showTextDocument(doc, { preview: true })
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to capture pane: ${err.message}`)
    }
  }

  const sendKeys = async (treeItem?: TreeItem) => {
    if (!(treeItem instanceof PaneTreeItem)) {
      vscode.window.showWarningMessage('Select a pane to send keys')
      return
    }
    const keys = await vscode.window.showInputBox({
      prompt: 'Keys to send',
      placeHolder: 'ls -la',
    })
    if (!keys) return
    try {
      await tmux.sendKeys(treeItem.target, keys)
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to send keys: ${err.message}`)
    }
  }

  const refresh = () => treeProvider.refresh()

  // Register all commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tmuxgo_vscode.attachSession', attach),
    vscode.commands.registerCommand('tmuxgo_vscode.attachExclusive', attachExclusive),
    vscode.commands.registerCommand('tmuxgo_vscode.newSession', newSession),
    vscode.commands.registerCommand('tmuxgo_vscode.killSession', killSession),
    vscode.commands.registerCommand('tmuxgo_vscode.renameSession', renameSession),
    vscode.commands.registerCommand('tmuxgo_vscode.newWindow', newWindow),
    vscode.commands.registerCommand('tmuxgo_vscode.killWindow', killWindow),
    vscode.commands.registerCommand('tmuxgo_vscode.renameWindow', renameWindow),
    vscode.commands.registerCommand('tmuxgo_vscode.splitHorizontal', (item) => splitPane('horizontal', item)),
    vscode.commands.registerCommand('tmuxgo_vscode.splitVertical', (item) => splitPane('vertical', item)),
    vscode.commands.registerCommand('tmuxgo_vscode.killPane', killPane),
    vscode.commands.registerCommand('tmuxgo_vscode.toggleZoom', toggleZoom),
    vscode.commands.registerCommand('tmuxgo_vscode.capturePane', capturePane),
    vscode.commands.registerCommand('tmuxgo_vscode.sendKeys', sendKeys),
    vscode.commands.registerCommand('tmuxgo_vscode.refresh', refresh),
  )
}

async function pickSession(tmux: TmuxClient): Promise<string | undefined> {
  const sessions = await tmux.listSessions()
  if (sessions.length === 0) {
    vscode.window.showWarningMessage('No tmux sessions found')
    return undefined
  }
  const items = sessions.map(s => ({
    label: s.name,
    description: `${s.windows.length} windows`,
    value: s.name,
  }))
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a tmux session',
  })
  return picked?.value
}
