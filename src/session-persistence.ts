import * as vscode from 'vscode'

const SESSION_ORDER_PREFIX = 'sessionOrder:'
const FAVORITE_SESSIONS_KEY = 'favoriteSessions'

export class SessionOrderManager {
  constructor(private context: vscode.ExtensionContext) {}

  getSessionOrder(hostId: string): string[] {
    return this.context.globalState.get<string[]>(SESSION_ORDER_PREFIX + hostId, [])
  }

  setSessionOrder(hostId: string, order: string[]): Thenable<void> {
    return this.context.globalState.update(SESSION_ORDER_PREFIX + hostId, order)
  }

  getFavoriteSessions(): string[] {
    return this.context.globalState.get<string[]>(FAVORITE_SESSIONS_KEY, [])
  }

  async toggleFavorite(sessionName: string): Promise<void> {
    const favorites = this.getFavoriteSessions()
    const idx = favorites.indexOf(sessionName)
    if (idx >= 0) {
      favorites.splice(idx, 1)
    } else {
      favorites.push(sessionName)
    }
    await this.context.globalState.update(FAVORITE_SESSIONS_KEY, favorites)
  }
}
