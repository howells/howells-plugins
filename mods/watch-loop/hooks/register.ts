import type { Register } from 'claude-code'

const LIMIT = 3
const MIN_SLEEP_SECONDS = 10

const WATCH =
  /\bgh\s+run\s+(watch|view)\b|\bgh\s+pr\s+checks\b|\bvercel\s+(inspect|logs)\b|\buntil\b[^;]*;\s*do\b|\bwhile\b[^;]*;\s*do\b[\s\S]*\bsleep\b/

export const isPoll = (command: string): boolean => {
  if (WATCH.test(command)) {
    return true
  }

  for (const match of command.matchAll(/\bsleep\s+(\d+(?:\.\d+)?)([smh]?)/g)) {
    const scale = match[2] === 'h' ? 3600 : match[2] === 'm' ? 60 : 1

    if (Number(match[1]) * scale >= MIN_SLEEP_SECONDS) {
      return true
    }
  }

  return false
}

export const register: Register = on => {
  const polls = new Map<string, number>()

  on('prompt.submit', ($, e, next) => {
    polls.clear()

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    const loop = e.agentId ?? 'main'

    if (e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'NotebookEdit') {
      polls.delete(loop)

      return next(e)
    }

    if (e.tool !== 'Bash' || !isPoll(e.command)) {
      return next(e)
    }

    const count = (polls.get(loop) ?? 0) + 1

    if (count < LIMIT) {
      polls.set(loop, count)

      return next(e)
    }

    polls.delete(loop)
    $.ui.toast('watch-loop: held a third poll in a row')

    return {
      deny: `${$.plugin.name}: third poll or wait in a row with no edit between. Polling ships nothing. Do other work now and check once at the end of the expected duration, or say what is blocked.`,
    }
  })
}
