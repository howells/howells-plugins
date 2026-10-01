import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Reading } from '../types'

const reading = atom({ plugin: 'session-band', key: 'reading' } as const, null)

const WARN_TOKENS = 100_000

const short = (tokens: number): string =>
  tokens >= 1_000_000 ? `${(tokens / 1_000_000).toFixed(1)}M` : `${Math.round(tokens / 1000)}k`

const LIMIT_LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

const measure = async ($: EngineInterface, seen: { model?: string; effort?: string | null }) => {
  const usage = await $.session.usage({ breakdown: 'summary' })
  const { context, rateLimits } = usage
  const previous = await read($, reading)

  const next: Reading = {
    model: seen.model ?? context.breakdown?.model ?? previous?.model ?? '',
    effort: seen.effort === undefined ? (previous?.effort ?? null) : seen.effort,
    tokens: context.tokens ?? null,
    window: context.window,
    compactAt: context.breakdown?.autoCompactThreshold ?? null,
    limits: rateLimits.map(({ kind, percentUsed }) => ({ kind, percentUsed })),
  }

  await update($, reading, () => next)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await measure($, {})

    return started
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      await measure($, { model: e.model, effort: e.effort === undefined ? null : String(e.effort) })
    }

    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)

    if (e.agentId === undefined) {
      await measure($, {})
    }

    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, reading)

    if (e.props.hasSurvey || now === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const used = now.tokens ?? 0
    const percent = Math.round((used / now.window) * 100)
    const left = now.compactAt === null ? null : now.compactAt - used
    const isClose = left !== null && left < WARN_TOKENS
    const hot = now.limits.filter(limit => limit.percentUsed >= 50)

    return (
      <Box>
        <Text dimColor>
          {now.model}
          {now.effort === null ? '' : ` · ${now.effort}`} · {short(used)}/{short(now.window)} {percent}%
        </Text>
        {left === null ? null : (
          <Text dimColor={!isClose} color={isClose ? 'yellow' : undefined}>
            {' · '}
            {left > 0 ? `compacts in ${short(left)}` : 'compacting next'}
          </Text>
        )}
        {hot.map(limit => (
          <Text key={limit.kind} dimColor={limit.percentUsed < 80} color={limit.percentUsed >= 80 ? 'yellow' : undefined}>
            {' · '}
            {LIMIT_LABELS[limit.kind] ?? limit.kind} {Math.round(limit.percentUsed)}%
          </Text>
        ))}
      </Box>
    )
  })
}
