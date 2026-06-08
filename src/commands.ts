import * as vscode from 'vscode'
import { TmuxClient } from './tmux-client'
import { SessionTreeProvider } from './session-tree-provider'
import { SessionPseudoterminal } from './session-pseudoterminal'
import { SessionTreeItem, WindowTreeItem, PaneTreeItem, type TreeItem } from './session-tree-items'
import { batchKillSessions, showBatchDeletePreview } from './batch-operations'
import { SessionOrderManager } from './session-persistence'

export const attachedTerminals = new Map<string, vscode.Terminal>()

function createAndTrackTerminal(
  context: vscode.ExtensionContext,
  treeProvider: SessionTreeProvider,
  sessionName: string,
  pty: SessionPseudoterminal
): vscode.Terminal {
  const terminal = vscode.window.createTerminal({
    name: `tmux: ${sessionName}`,
    pty,
  })
  attachedTerminals.set(sessionName, terminal)
  terminal.show()

  const disposable = vscode.window.onDidCloseTerminal(t => {
    if (t === terminal) {
      attachedTerminals.delete(sessionName)
      disposable.dispose()
      treeProvider.refresh()
    }
  })
  context.subscriptions.push(disposable)
  return terminal
}

export function registerCommands(
  context: vscode.ExtensionContext,
  tmux: TmuxClient,
  treeProvider: SessionTreeProvider
): void {
  const orderManager = new SessionOrderManager(context)

  const attach = async (treeItem?: TreeItem) => {
    const sessionName = treeItem instanceof SessionTreeItem
      ? treeItem.session.name
      : await pickSession(tmux)
    if (!sessionName) return

    const existing = attachedTerminals.get(sessionName)
    if (existing) {
      existing.show()
      return
    }

    const pty = new SessionPseudoterminal(sessionName)
    createAndTrackTerminal(context, treeProvider, sessionName, pty)
  }

  const attachExclusive = async (treeItem?: TreeItem) => {
    const sessionName = treeItem instanceof SessionTreeItem
      ? treeItem.session.name
      : await pickSession(tmux)
    if (!sessionName) return

    const pty = new SessionPseudoterminal(sessionName, { exclusive: true })
    createAndTrackTerminal(context, treeProvider, sessionName, pty)
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
      vscode.window.showInformationMessage('Keys sent')
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to send keys: ${err.message}`)
    }
  }

  const selectWindow = async (treeItemOrTarget?: TreeItem | string) => {
    const target = treeItemOrTarget instanceof WindowTreeItem
      ? `${treeItemOrTarget.sessionName}:${treeItemOrTarget.window.index}`
      : typeof treeItemOrTarget === 'string'
        ? treeItemOrTarget
        : undefined
    if (!target) return
    try {
      await tmux.selectWindow(target)
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to select window: ${err.message}`)
    }
  }

  const selectPane = async (treeItemOrTarget?: TreeItem | string) => {
    const target = treeItemOrTarget instanceof PaneTreeItem
      ? treeItemOrTarget.target
      : typeof treeItemOrTarget === 'string'
        ? treeItemOrTarget
        : undefined
    if (!target) return
    try {
      await tmux.selectPane(target)
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to select pane: ${err.message}`)
    }
  }

  const switchWindow = async () => {
    const sessionName = await pickSession(tmux)
    if (!sessionName) return
    const target = await pickWindows(tmux, sessionName)
    if (!target) return
    try {
      await tmux.selectWindow(target)
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to switch window: ${err.message}`)
    }
  }

  const doBatchKillSessions = async () => {
    const sessions = await tmux.listSessions()
    if (sessions.length === 0) {
      vscode.window.showWarningMessage('No tmux sessions found')
      return
    }

    const confirmed = await showBatchDeletePreview(sessions.map(s => s.name))
    if (!confirmed) return

    const picks = sessions.map(s => ({
      label: s.name,
      description: `${s.windows.length} windows`,
      picked: true,
    }))
    const selected = await vscode.window.showQuickPick(picks, {
      canPickMany: true,
      placeHolder: 'Select sessions to kill',
      title: 'Batch Kill Sessions',
    })
    if (!selected || selected.length === 0) return

    const names = selected.map(s => s.label)
    const result = await batchKillSessions(tmux, names)

    treeProvider.refresh()
    if (result.failed.length > 0) {
      const failedList = result.failed.map(f => `${f.name}: ${f.error}`).join('\n')
      vscode.window.showErrorMessage(
        `Batch kill: ${result.success.length} succeeded, ${result.failed.length} failed\n${failedList}`
      )
    } else {
      vscode.window.showInformationMessage(`Batch kill: ${result.success.length} session${result.success.length > 1 ? 's' : ''} killed`)
    }
  }

  const toggleFavorite = async (treeItem?: TreeItem) => {
    const sessionName = treeItem instanceof SessionTreeItem
      ? treeItem.session.name
      : await pickSession(tmux)
    if (!sessionName) return

    try {
      await orderManager.toggleFavorite(sessionName)
      treeProvider.refresh()
      const favorites = orderManager.getFavoriteSessions()
      const isFav = favorites.includes(sessionName)
      vscode.window.showInformationMessage(
        isFav ? `"${sessionName}" added to favorites` : `"${sessionName}" removed from favorites`
      )
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to toggle favorite: ${err.message}`)
    }
  }

  const refresh = () => treeProvider.refresh()

  const collapseAll = () => {
    vscode.commands.executeCommand('workbench.actions.treeView.tmuxgo_sessions.collapseAll')
  }

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
    vscode.commands.registerCommand('tmuxgo_vscode.selectWindow', selectWindow),
    vscode.commands.registerCommand('tmuxgo_vscode.selectPane', selectPane),
    vscode.commands.registerCommand('tmuxgo_vscode.switchWindow', switchWindow),
    vscode.commands.registerCommand('tmuxgo_vscode.batchKillSessions', doBatchKillSessions),
    vscode.commands.registerCommand('tmuxgo_vscode.toggleFavorite', toggleFavorite),
    vscode.commands.registerCommand('tmuxgo_vscode.refresh', refresh),
    vscode.commands.registerCommand('tmuxgo_vscode.collapseAll', collapseAll),
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

async function pickWindows(tmux: TmuxClient, sessionName: string): Promise<string | undefined> {
  const windows = await tmux.listWindows(sessionName)
  if (windows.length === 0) {
    vscode.window.showWarningMessage('No windows found in session')
    return undefined
  }
  const items = windows.map(w => ({
    label: `@${w.index} ${w.name}`,
    description: w.active ? '(active)' : `${w.panes.length} panes`,
    value: `${sessionName}:${w.index}`,
  }))
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a window',
  })
  return picked?.value
}
