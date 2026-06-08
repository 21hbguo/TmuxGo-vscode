import type { TmuxClient } from './tmux-client'
import type { SessionTemplate, TemplateWindow } from './types'

const templates: SessionTemplate[] = [
  {
    name: 'Default',
    description: 'Single window session',
    windows: [{ name: 'main', panes: [{}] }],
  },
  {
    name: 'Development',
    description: 'Editor and dev server',
    windows: [
      { name: 'editor', panes: [{}] },
      { name: 'server', panes: [{ command: 'npm run dev' }] },
    ],
  },
  {
    name: 'Monitoring',
    description: 'System monitoring with htop and logs',
    windows: [
      { name: 'top', panes: [{ command: 'htop' }] },
      { name: 'logs', panes: [{ command: 'tail -f /var/log/syslog' }] },
    ],
  },
  {
    name: 'Side by Side',
    description: 'Single window with two vertical panes',
    windows: [
      { name: 'main', panes: [{}, { split: 'vertical' }] },
    ],
  },
]

export function getTemplates(): SessionTemplate[] {
  return templates
}

export async function applyTemplateLayout(
  tmux: TmuxClient,
  sessionName: string,
  template: SessionTemplate,
): Promise<void> {
  for (let i = 0; i < template.windows.length; i++) {
    const window = template.windows[i]
    const windowTarget = i === 0 ? sessionName : `${sessionName}:${window.name}`

    if (i > 0) {
      await tmux.newWindow(sessionName, window.name)
    }

    for (let j = 1; j < window.panes.length; j++) {
      const pane = window.panes[j]
      await tmux.splitPane(windowTarget, pane.split || 'vertical')
    }

    for (let j = 0; j < window.panes.length; j++) {
      const pane = window.panes[j]
      if (pane.command) {
        const paneTarget = `${windowTarget}.${j}`
        await tmux.sendKeys(paneTarget, pane.command)
      }
    }

    await tmux.exec(['select-layout', '-t', windowTarget])
  }
}
