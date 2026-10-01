import { expect, test } from 'claude-code/testing'

test('retries a dropped browser call and leaves other errors alone', async ($, on) => {
  let calls = 0

  on('clock.sleep', () => ({ value: undefined }) as never)
  on('tool.call', (_, e) => {
    calls += 1

    if (String(e.tool) === 'mcp__claude-in-chrome__navigate' && calls < 3) {
      return { isError: true, result: undefined, text: 'Browser extension is not connected' } as never
    }

    if (String(e.tool) === 'mcp__claude_ai_Linear__get_issue') {
      return { isError: true, result: undefined, text: 'Entity not found' } as never
    }

    return { result: 'ok' } as never
  })

  const chrome = await $.tool.call({ tool: 'mcp__claude-in-chrome__navigate', url: 'https://example.com' })
  expect(chrome.isError).toBeUndefined()
  expect(calls).toBe(3)

  calls = 0
  const linear = await $.tool.call({ tool: 'mcp__claude_ai_Linear__get_issue', id: 'HOW-1' })
  expect(linear.isError).toBe(true)
  expect(calls).toBe(1)
})
