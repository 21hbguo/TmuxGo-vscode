import * as vscode from 'vscode'
import type { TmuxClient } from './tmux-client'

export interface BatchResult {
  success: string[]
  failed: { name: string; error: string }[]
}

export async function batchKillSessions(tmux: TmuxClient, sessions: string[]): Promise<BatchResult> {
  const success: string[] = []
  const failed: { name: string; error: string }[] = []

  await Promise.all(sessions.map(async (name) => {
    try {
      await tmux.exec(['kill-session', '-t', name])
      success.push(name)
    } catch (e: any) {
      failed.push({ name, error: e.message ?? String(e) })
    }
  }))

  return { success, failed }
}

export async function showBatchDeletePreview(sessions: string[]): Promise<boolean> {
  const picks = sessions.map(s => ({ label: s, picked: true }))
  const selected = await vscode.window.showQuickPick(picks, {
    canPickMany: true,
    placeHolder: 'Select sessions to kill',
    title: 'Batch Kill Sessions',
  })

  if (!selected || selected.length === 0) return false

  const count = selected.length
  const confirm = await vscode.window.showWarningMessage(
    `Kill ${count} session${count > 1 ? 's' : ''}?`,
    { modal: true },
    'Kill',
  )
  return confirm === 'Kill'
}
