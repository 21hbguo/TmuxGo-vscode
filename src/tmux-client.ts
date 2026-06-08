import { execFile } from 'child_process'
import { promisify } from 'util'
import type { TmuxSession, TmuxWindow, TmuxPane } from './types'

const execFileAsync = promisify(execFile)

export class TmuxClient {
  async exec(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('tmux', args, { timeout: 5000 })
    return stdout.trim()
  }

  async execRaw(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return execFileAsync('tmux', args, { timeout: 5000 })
  }

  async listSessions(): Promise<TmuxSession[]> {
    try {
      const raw = await this.exec([
        'list-sessions', '-F',
        '#{session_id}|#{session_name}|#{session_attached}|#{session_created}'
      ])
      if (!raw) return []
      const sessions: TmuxSession[] = []
      for (const line of raw.split('\n')) {
        const [id, name, attached, created] = line.split('|')
        sessions.push({
          id,
          name,
          attached: parseInt(attached, 10) || 0,
          windows: await this.listWindows(name),
          createdAt: created,
        })
      }
      return sessions
    } catch {
      return []
    }
  }

  async listWindows(session: string): Promise<TmuxWindow[]> {
    try {
      const raw = await this.exec([
        'list-windows', '-t', session, '-F',
        '#{window_id}|#{window_index}|#{window_name}|#{window_active}'
      ])
      if (!raw) return []
      const windows: TmuxWindow[] = []
      for (const line of raw.split('\n')) {
        const [id, index, name, active] = line.split('|')
        windows.push({
          id,
          index: parseInt(index, 10),
          name,
          active: active === '1',
          panes: await this.listPanes(`${session}:${index}`),
        })
      }
      return windows
    } catch {
      return []
    }
  }

  async listPanes(target: string): Promise<TmuxPane[]> {
    try {
      const raw = await this.exec([
        'list-panes', '-t', target, '-F',
        '#{pane_id}|#{pane_index}|#{pane_title}|#{pane_width}|#{pane_height}|#{pane_active}|#{pane_zoomed}'
      ])
      if (!raw) return []
      const panes: TmuxPane[] = []
      for (const line of raw.split('\n')) {
        const [id, index, title, w, h, active, zoomed] = line.split('|')
        panes.push({
          id,
          index: parseInt(index, 10),
          title,
          width: parseInt(w, 10),
          height: parseInt(h, 10),
          active: active === '1',
          zoomed: zoomed === '1',
        })
      }
      return panes
    } catch {
      return []
    }
  }

  async createSession(name: string, cwd?: string): Promise<void> {
    const args = ['new-session', '-d', '-s', name]
    if (cwd) args.push('-c', cwd)
    await this.exec(args)
  }

  async killSession(session: string): Promise<void> {
    await this.exec(['kill-session', '-t', session])
  }

  async renameSession(session: string, newName: string): Promise<void> {
    await this.exec(['rename-session', '-t', session, newName])
  }

  async newWindow(session: string, name?: string): Promise<void> {
    const args = ['new-window', '-t', session]
    if (name) args.push('-n', name)
    await this.exec(args)
  }

  async killWindow(target: string): Promise<void> {
    await this.exec(['kill-window', '-t', target])
  }

  async renameWindow(target: string, name: string): Promise<void> {
    await this.exec(['rename-window', '-t', target, name])
  }

  async splitPane(target: string, direction: 'horizontal' | 'vertical'): Promise<void> {
    const flag = direction === 'horizontal' ? '-h' : '-v'
    await this.exec(['split-window', flag, '-t', target])
  }

  async killPane(target: string): Promise<void> {
    await this.exec(['kill-pane', '-t', target])
  }

  async selectPane(target: string): Promise<void> {
    await this.exec(['select-pane', '-t', target])
  }

  async selectWindow(target: string): Promise<void> {
    await this.exec(['select-window', '-t', target])
  }

  async toggleZoom(target: string): Promise<void> {
    await this.exec(['resize-pane', '-Z', '-t', target])
  }

  async capturePane(target: string): Promise<string> {
    return this.exec(['capture-pane', '-t', target, '-p'])
  }

  async sendKeys(target: string, keys: string, enter = true): Promise<void> {
    const args = ['send-keys', '-t', target, keys]
    if (enter) args.push('Enter')
    await this.exec(args)
  }

  async hasSession(name: string): Promise<boolean> {
    try {
      await this.exec(['has-session', '-t', name])
      return true
    } catch {
      return false
    }
  }

  async setOption(session: string, option: string, value: string): Promise<void> {
    await this.exec(['set-option', '-t', session, option, value])
  }
}
