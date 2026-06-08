import * as vscode from 'vscode'
import { TmuxSession } from './types'

export type SessionAction = 'attach' | 'kill' | 'newWindow'

export class SessionDetailsWebview implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tmuxgo.sessionDetails'

  private webviewView?: vscode.WebviewView
  private currentSession?: TmuxSession
  private readonly onAction = new vscode.EventEmitter<{ action: SessionAction; session: TmuxSession }>()
  public readonly onDidAction = this.onAction.event

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.webviewView = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    }

    webviewView.webview.html = this.renderHtml()

    webviewView.webview.onDidReceiveMessage((msg: { type: string }) => {
      if (!this.currentSession) return
      const action = msg.type as SessionAction
      if (['attach', 'kill', 'newWindow'].includes(action)) {
        this.onAction.fire({ action, session: this.currentSession })
      }
    })
  }

  public updateSession(session: TmuxSession | undefined) {
    this.currentSession = session
    if (!session) {
      // show empty state
      this.webviewView?.webview.postMessage({ type: 'update', session: null })
      return
    }
    const paneCount = session.windows.reduce((n, w) => n + w.panes.length, 0)
    this.webviewView?.webview.postMessage({
      type: 'update',
      session: {
        name: session.name,
        windowCount: session.windows.length,
        paneCount,
        attached: session.attached,
      },
    })
  }

  private renderHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --pad: 10px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    padding: var(--pad);
  }
  .empty {
    color: var(--vscode-descriptionForeground);
    text-align: center;
    padding: 24px 0;
  }
  .details { display: none; }
  .details.visible { display: block; }
  h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    word-break: break-all;
  }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 12px;
  }
  .stat {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 4px;
    padding: 6px 8px;
  }
  .stat-label {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }
  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  button {
    display: block;
    width: 100%;
    padding: 6px 0;
    font-family: var(--vscode-font-family, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
    border: none;
    border-radius: 2px;
    cursor: pointer;
    text-align: center;
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.danger {
    background: var(--vscode-errorForeground);
    color: var(--vscode-editor-background);
  }
  button.danger:hover { opacity: 0.9; }
</style>
</head>
<body>
  <div id="empty" class="empty">No session selected</div>
  <div id="details" class="details">
    <h3 id="name"></h3>
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Windows</div>
        <div class="stat-value" id="windowCount">0</div>
      </div>
      <div class="stat">
        <div class="stat-label">Panes</div>
        <div class="stat-value" id="paneCount">0</div>
      </div>
      <div class="stat">
        <div class="stat-label">Clients</div>
        <div class="stat-value" id="attached">0</div>
      </div>
    </div>
    <div class="actions">
      <button id="btnAttach">Attach</button>
      <button id="btnNewWindow">New Window</button>
      <button id="btnKill" class="danger">Kill Session</button>
    </div>
  </div>
<script>
  const vscode = acquireVsCodeApi();
  const $empty    = document.getElementById('empty');
  const $details  = document.getElementById('details');
  const $name     = document.getElementById('name');
  const $winCnt   = document.getElementById('windowCount');
  const $paneCnt  = document.getElementById('paneCount');
  const $attached = document.getElementById('attached');

  document.getElementById('btnAttach').addEventListener('click',    () => vscode.postMessage({ type: 'attach' }));
  document.getElementById('btnNewWindow').addEventListener('click', () => vscode.postMessage({ type: 'newWindow' }));
  document.getElementById('btnKill').addEventListener('click',     () => vscode.postMessage({ type: 'kill' }));

  window.addEventListener('message', e => {
    const data = e.data;
    if (data.type !== 'update') return;
    if (!data.session) {
      $empty.style.display = 'block';
      $details.classList.remove('visible');
      return;
    }
    $empty.style.display = 'none';
    $details.classList.add('visible');
    $name.textContent     = data.session.name;
    $winCnt.textContent   = data.session.windowCount;
    $paneCnt.textContent  = data.session.paneCount;
    $attached.textContent = data.session.attached;
  });
</script>
</body>
</html>`
  }
}
