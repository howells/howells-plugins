import { expect, test } from 'claude-code/testing'

const bash = (command: string) => ({ tool: 'Bash' as const, command })

test('denies the third poll in a row and lets an edit reset the count', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }) as never)

  expect((await $.tool.call(bash('sleep 30 && gh run view 1'))).deny).toBeUndefined()
  expect((await $.tool.call(bash('sleep 2 && curl -s localhost:3000'))).deny).toBeUndefined()
  expect((await $.tool.call(bash('gh pr checks 12'))).deny).toBeUndefined()
  expect((await $.tool.call(bash('vercel inspect dpl_1'))).deny).toContain('third poll')

  await $.tool.call(bash('sleep 60'))
  await $.tool.call(bash('sleep 60'))
  await $.tool.call({ tool: 'Write', file_path: '/tmp/a.txt', content: 'a' })
  expect((await $.tool.call(bash('sleep 60'))).deny).toBeUndefined()
})
