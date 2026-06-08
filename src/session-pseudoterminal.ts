import * as vscode from 'vscode'
import { spawn, type IPty } from 'node-pty'

export interface AttachOptions {
  exclusive?: boolean
  cwd?: string
}

export class SessionPseudoterminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>()
  private closeEmitter = new vscode.EventEmitter<number | undefined>()
  private pty: IPty | undefined

  readonly onDidWrite = this.writeEmitter.event
  readonly onDidClose = this.closeEmitter.event

  constructor(
    private sessionName: string,
    private options: AttachOptions = {}
  ) {}

  open(): void {
    const args = ['attach', '-t', this.sessionName, '-d']
    args.push('-f', 'ignore-size,active-pane')

    this.pty = spawn('tmux', args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: this.options.cwd,
    })

    this.pty.onData((data: string) => {
      this.writeEmitter.fire(data)
    })

    this.pty.onExit(({ exitCode }) => {
      this.closeEmitter.fire(exitCode)
    })
  }

  close(): void {
    this.pty?.kill()
    this.pty = undefined
  }

  handleInput(data: string): void {
    this.pty?.write(data)
  }

  setDimensions(dimensions: vscode.TerminalDimensions): void {
    this.pty?.resize(dimensions.columns, dimensions.rows)
  }
}
