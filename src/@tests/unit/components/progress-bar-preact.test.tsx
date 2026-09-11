import { assertEquals, assertStringIncludes } from '@std/assert'
import { h } from 'preact'
import type { VNode } from 'preact'
import { render } from 'preact-render-to-string'
import { ProgressBar } from 'components/ProgressBar/index.preact.ts'
import type { ProgressBarProps } from 'components/ProgressBar/types.ts'

// Rendered via `h(ProgressBar, props)` (never called as a plain function) — this component now
// calls a real hook (`useId`), which needs an active component render context to work at all; see
// `Countdown-preact.test.tsx`'s own identical `h(Countdown, props)` shape for the same reason.
//
// Going through this `element()` helper (rather than `h(ProgressBar, {})` inline) matters even
// though `Countdown`'s own equivalent helper looks identical: every `ProgressBarProps` field is
// optional, so an inline `{}` literal gives `h`'s generic overload nothing to infer `P` from, and
// it falls back to inferring `P` as `{}` — which then fails to structurally match `ProgressBarProps`
// (a "weak type" with no properties in common with `{}`). Annotating `props` here as
// `ProgressBarProps` up front sidesteps that inference entirely.
function element(props: ProgressBarProps): VNode {
  return h(ProgressBar, props) as VNode
}

Deno.test('ProgressBar (preact): renders a track/fill pair, data-space-ui on track only', () => {
  const html = render(element({}))

  assertStringIncludes(html, 'data-space-ui="progress-bar"')
  const trackOpenTag = html.slice(0, html.indexOf('>') + 1)
  const fillHtml = html.slice(html.indexOf('</style>') + '</style>'.length)
  assertEquals(fillHtml.includes('data-space-ui'), false)
  assertStringIncludes(trackOpenTag, 'data-space-ui="progress-bar"')
})

Deno.test('ProgressBar (preact): height defaults to 7px', () => {
  const html = render(element({}))

  assertStringIncludes(html, 'height:7px')
})

Deno.test('ProgressBar (preact): a numeric height is treated as pixels', () => {
  const html = render(element({ height: 12 }))

  assertStringIncludes(html, 'height:12px')
})

Deno.test('ProgressBar (preact): a string height is used verbatim', () => {
  const html = render(element({ height: '0.5rem' }))

  assertStringIncludes(html, 'height:0.5rem')
})

Deno.test('ProgressBar (preact): without label, the track is aria-hidden and has no role', () => {
  const html = render(element({}))

  assertStringIncludes(html, 'aria-hidden="true"')
  assertEquals(html.includes('role='), false)
  assertEquals(html.includes('aria-label='), false)
  assertEquals(html.includes('aria-valuemin='), false)
  assertEquals(html.includes('aria-valuemax='), false)
})

Deno.test('ProgressBar (preact): with label, the track gets role and declared bounds', () => {
  const html = render(element({ label: 'Loading' }))

  assertStringIncludes(html, 'role="progressbar"')
  assertStringIncludes(html, 'aria-label="Loading"')
  assertStringIncludes(html, 'aria-valuemin="0"')
  assertStringIncludes(html, 'aria-valuemax="100"')
  assertEquals(html.includes('aria-hidden'), false)
})

Deno.test('ProgressBar (preact): aria-valuenow is never rendered', () => {
  const withoutTimeout = render(element({ label: 'Loading' }))
  const withTimeout = render(element({ label: 'Loading', timeout: 5000 }))

  assertEquals(withoutTimeout.includes('aria-valuenow'), false)
  assertEquals(withTimeout.includes('aria-valuenow'), false)
})

Deno.test('ProgressBar (preact): without timeout, the fill has no data-timeout attribute', () => {
  const html = render(element({}))

  assertEquals(html.includes('data-timeout'), false)
})

Deno.test(
  'ProgressBar (preact): with timeout, the fill carries data-timeout and the duration property',
  () => {
    const html = render(element({ timeout: 3000 }))

    assertStringIncludes(html, 'data-timeout="3000"')
    assertStringIncludes(html, '--space-ui-progress-duration:3000ms')
  },
)

Deno.test('ProgressBar (preact): id and className are forwarded onto the track', () => {
  const html = render(element({ id: 'save-progress', className: 'ui-progress' }))

  assertStringIncludes(html, 'id="save-progress"')
  assertStringIncludes(html, 'class="ui-progress"')
})

Deno.test('ProgressBar (preact): a realistic multi-prop example renders well-formed markup', () => {
  const html = render(
    element({ timeout: 5000, height: 4, label: 'Auto-dismissing', id: 'toast-progress' }),
  )

  assertStringIncludes(html, 'id="toast-progress"')
  assertStringIncludes(html, 'height:4px')
  assertStringIncludes(html, 'role="progressbar"')
  assertStringIncludes(html, 'aria-label="Auto-dismissing"')
  assertStringIncludes(html, 'data-timeout="5000"')
  assertStringIncludes(html, '--space-ui-progress-duration:5000ms')
})

Deno.test('ProgressBar (preact): nonce lands on the self-rendered <style> element', () => {
  const html = render(element({ nonce: 'abc123' }))

  assertStringIncludes(html, '<style nonce="abc123">')
})
