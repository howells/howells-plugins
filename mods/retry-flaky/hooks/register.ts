import type { Register } from 'claude-code'

const RETRIES = 2
const PAUSE_MS = 1500

const FLAKY = /^mcp__(claude-in-chrome|Claude_Browser|claude_ai_Linear|plugin_linear_linear)__/

// Only errors that mean the call never reached the tool: a retry cannot repeat a write.
const DROPPED =
  /not connected|ECONNREFUSED|socket hang up|connection (closed|refused)|extension (is not|not|was) (connected|running|available)|no (browser|extension) (connected|available)|MCP error -32000/i

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    let ran = await next(e)

    if (!FLAKY.test(tool)) {
      return ran
    }

    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      const hasDropped = ran.deny === undefined && ran.isError === true && DROPPED.test(ran.text ?? '')

      if (!hasDropped || next.signal.aborted) {
        return ran
      }

      await $.clock.sleep(PAUSE_MS)
      ran = await next(e)

      if (ran.deny === undefined && ran.isError !== true) {
        $.ui.toast(`retry-flaky: ${tool.split('__')[1]} recovered on retry ${attempt}`)
      }
    }

    return ran
  })
}
