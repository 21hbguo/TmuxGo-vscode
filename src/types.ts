export interface TmuxPane {
  id: string
  index: number
  title: string
  width: number
  height: number
  active: boolean
  zoomed: boolean
}

export interface TmuxWindow {
  id: string
  index: number
  name: string
  active: boolean
  panes: TmuxPane[]
}

export interface TmuxSession {
  id: string
  name: string
  attached: number
  windows: TmuxWindow[]
  createdAt?: string
}

export interface HostConfig {
  id: string
  name: string
  type: 'local' | 'remote'
  host?: string
  port?: number
  user?: string
  authMethod?: 'key' | 'password'
  keyPath?: string
}

export interface SessionTemplate {
  name: string
  description: string
  windows: TemplateWindow[]
}

export interface TemplateWindow {
  name: string
  panes: TemplatePane[]
  layout?: string
}

export interface TemplatePane {
  command?: string
  split?: 'horizontal' | 'vertical'
}
