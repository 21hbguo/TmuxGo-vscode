import * as vscode from 'vscode'
import { TmuxClient } from './tmux-client'
import { HostTreeItem, SessionTreeItem, WindowTreeItem, PaneTreeItem, type TreeItem } from './session-tree-items'
import type { HostConfig, TmuxSession } from './types'

export class SessionTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private refreshTimer: ReturnType<typeof setInterval> | undefined
  private hosts: HostConfig[] = []

  constructor(private tmux: TmuxClient) {}

  refresh(item?: TreeItem): void {
    this._onDidChangeTreeData.fire(item)
  }

  startAutoRefresh(intervalMs = 2000): void {
    this.stopAutoRefresh()
    this.refreshTimer = setInterval(() => this.refresh(), intervalMs)
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      return this.getRootItems()
    }
    if (element instanceof HostTreeItem) {
      return element.sessions.map(s => new SessionTreeItem(s, element.host.id))
    }
    if (element instanceof SessionTreeItem) {
      return element.session.windows.map(w =>
        new WindowTreeItem(w, element.session.name, element.hostId)
      )
    }
    if (element instanceof WindowTreeItem) {
      const target = `${element.sessionName}:${element.window.index}`
      return element.window.panes.map(p =>
        new PaneTreeItem(p, `${target}.${p.index}`, element.hostId)
      )
    }
    return []
  }

  private async getRootItems(): Promise<HostTreeItem[]> {
    const items: HostTreeItem[] = []

    // Local host always present
    const localHost: HostConfig = { id: 'local', name: 'LOCAL', type: 'local' }
    try {
      const sessions = await this.tmux.listSessions()
      items.push(new HostTreeItem(localHost, sessions))
    } catch {
      items.push(new HostTreeItem(localHost, []))
    }

    // Remote hosts from config
    for (const host of this.hosts.filter(h => h.type === 'remote')) {
      items.push(new HostTreeItem(host, []))
    }

    return items
  }

  setHosts(hosts: HostConfig[]): void {
    this.hosts = hosts
    this.refresh()
  }

  dispose(): void {
    this.stopAutoRefresh()
    this._onDidChangeTreeData.dispose()
  }
}
