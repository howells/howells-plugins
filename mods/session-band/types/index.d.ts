export type Reading = {
  model: string
  effort: string | null
  tokens: number | null
  window: number
  compactAt: number | null
  limits: { kind: string; percentUsed: number }[]
}

declare module 'claude-code' {
  interface PluginState {
    'session-band': { reading: Reading | null }
  }
}
