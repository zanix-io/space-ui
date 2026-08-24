import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { ProgressBar } from 'components/ProgressBar/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.
// `ProgressBar` never returns `null`, so no `assert(vnode)` narrowing is needed here.

Deno.test('ProgressBar (preact): renders a track/fill pair, data-space-ui on track only', () => {
  const html = render(ProgressBar({}))

  assertStringIncludes(html, 'data-space-ui="progress-bar"')
  const trackOpenTag = html.slice(0, html.indexOf('>') + 1)
  const fillHtml = html.slice(html.indexOf('>') + 1)
  assertEquals(fillHtml.includes('data-space-ui'), false)
  assertStringIncludes(trackOpenTag, 'data-space-ui="progress-bar"')
})

Deno.test('ProgressBar (preact): height defaults to 7px', () => {
  const html = render(ProgressBar({}))

  assertStringIncludes(html, 'style="height:7px;"')
})

Deno.test('ProgressBar (preact): a numeric height is treated as pixels', () => {
  const html = render(ProgressBar({ height: 12 }))

  assertStringIncludes(html, 'style="height:12px;"')
})

Deno.test('ProgressBar (preact): a string height is used verbatim', () => {
  const html = render(ProgressBar({ height: '0.5rem' }))

  assertStringIncludes(html, 'style="height:0.5rem;"')
})

Deno.test('ProgressBar (preact): without label, the track is aria-hidden and has no role', () => {
  const html = render(ProgressBar({}))

  assertStringIncludes(html, 'aria-hidden="true"')
  assertEquals(html.includes('role='), false)
  assertEquals(html.includes('aria-label='), false)
  assertEquals(html.includes('aria-valuemin='), false)
  assertEquals(html.includes('aria-valuemax='), false)
})

Deno.test('ProgressBar (preact): with label, the track gets role and declared bounds', () => {
  const html = render(ProgressBar({ label: 'Loading' }))

  assertStringIncludes(html, 'role="progressbar"')
  assertStringIncludes(html, 'aria-label="Loading"')
  assertStringIncludes(html, 'aria-valuemin="0"')
  assertStringIncludes(html, 'aria-valuemax="100"')
  assertEquals(html.includes('aria-hidden'), false)
})

Deno.test('ProgressBar (preact): aria-valuenow is never rendered', () => {
  const withoutTimeout = render(ProgressBar({ label: 'Loading' }))
  const withTimeout = render(ProgressBar({ label: 'Loading', timeout: 5000 }))

  assertEquals(withoutTimeout.includes('aria-valuenow'), false)
  assertEquals(withTimeout.includes('aria-valuenow'), false)
})

Deno.test('ProgressBar (preact): without timeout, the fill has no data-timeout attribute', () => {
  const html = render(ProgressBar({}))

  assertEquals(html.includes('data-timeout'), false)
})

Deno.test(
  'ProgressBar (preact): with timeout, the fill carries data-timeout and the duration property',
  () => {
    const html = render(ProgressBar({ timeout: 3000 }))

    assertStringIncludes(html, 'data-timeout="3000"')
    assertStringIncludes(html, 'style="--space-ui-progress-duration:3000ms;"')
  },
)

Deno.test('ProgressBar (preact): id and className are forwarded onto the track', () => {
  const html = render(ProgressBar({ id: 'save-progress', className: 'ui-progress' }))

  assertStringIncludes(html, 'id="save-progress"')
  assertStringIncludes(html, 'class="ui-progress"')
})

Deno.test('ProgressBar (preact): a realistic multi-prop example renders well-formed markup', () => {
  const html = render(
    ProgressBar({ timeout: 5000, height: 4, label: 'Auto-dismissing', id: 'toast-progress' }),
  )

  assertStringIncludes(html, 'id="toast-progress"')
  assertStringIncludes(html, 'style="height:4px;"')
  assertStringIncludes(html, 'role="progressbar"')
  assertStringIncludes(html, 'aria-label="Auto-dismissing"')
  assertStringIncludes(html, 'data-timeout="5000"')
  assertStringIncludes(html, '--space-ui-progress-duration:5000ms')
})
