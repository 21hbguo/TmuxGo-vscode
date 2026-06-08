import * as vscode from 'vscode'
import type { TmuxSession, TmuxWindow, TmuxPane, HostConfig } from './types'

export class HostTreeItem extends vscode.TreeItem {
  constructor(public readonly host: HostConfig, public readonly sessions: TmuxSession[]) {
    super(host.name, vscode.TreeItemCollapsibleState.Collapsed)
    this.contextValue = 'host'
    this.iconPath = new vscode.ThemeIcon(
      host.type === 'local' ? 'computer' : 'remote'
    )
    this.description = `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`
  }
}

export class SessionTreeItem extends vscode.TreeItem {
  constructor(public readonly session: TmuxSession, public readonly hostId: string) {
    super(session.name, vscode.TreeItemCollapsibleState.Collapsed)
    this.contextValue = 'session'
    this.iconPath = new vscode.ThemeIcon('terminal')
    this.description = `${session.windows.length} window${session.windows.length !== 1 ? 's' : ''}`
    this.command = {
      command: 'tmuxgo_vscode.attachSession',
      title: 'Attach',
      arguments: [this],
    }
  }
}

export class WindowTreeItem extends vscode.TreeItem {
  constructor(public readonly window: TmuxWindow, public readonly sessionName: string, public readonly hostId: string) {
    super(`@${window.index} ${window.name}`, vscode.TreeItemCollapsibleState.Collapsed)
    this.contextValue = 'window'
    this.iconPath = new vscode.ThemeIcon('browser')
    this.description = `${window.panes.length} pane${window.panes.length !== 1 ? 's' : ''}`
    if (window.active) {
      this.label = `@${window.index} ${window.name}`
      this.description = `(active) ${window.panes.length} pane${window.panes.length !== 1 ? 's' : ''}`
    }
    this.command = {
      command: 'tmuxgo_vscode.selectWindow',
      title: 'Select Window',
      arguments: [`${sessionName}:${window.index}`],
    }
  }
}

export class PaneTreeItem extends vscode.TreeItem {
  constructor(public readonly pane: TmuxPane, public readonly target: string, public readonly hostId: string) {
    super(`%${pane.index} ${pane.title || pane.id}`, vscode.TreeItemCollapsibleState.None)
    this.contextValue = 'pane'
    this.iconPath = new vscode.ThemeIcon('terminal')
    this.description = `${pane.width}x${pane.height}`
    if (pane.zoomed) {
      this.description += ' (zoomed)'
    }
    this.command = {
      command: 'tmuxgo_vscode.selectPane',
      title: 'Select Pane',
      arguments: [target],
    }
  }
}

export type TreeItem = HostTreeItem | SessionTreeItem | WindowTreeItem | PaneTreeItem
