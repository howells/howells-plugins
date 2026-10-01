import { expect, test } from 'claude-code/testing'

test('draws the band once a turn has been measured', async ($, on) => {
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 212_000, window: 1_000_000, percent: 21 }, rateLimits: [{ kind: 'five_hour', percentUsed: 62 }] } }) as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
    const ui = await $.ui.mount({
      plugin: 'session-band',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 },
    })
    expect(await ui.find({ type: 'Text', text: /212k\/1\.0M 21%/ })).toBeDefined()
    await ui.unmount()
  }
})
