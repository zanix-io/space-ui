import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProgressBar } from 'components/ProgressBar/index.ts'

Deno.test('ProgressBar: renders a track/fill pair with data-space-ui on the track only', () => {
  const html = renderToStaticMarkup(<ProgressBar />)

  assertStringIncludes(html, '<div data-space-ui="progress-bar"')
  const trackOpenTag = html.slice(0, html.indexOf('>') + 1)
  const fillHtml = html.slice(html.indexOf('>') + 1)
  assertEquals(fillHtml.includes('data-space-ui'), false)
  assertStringIncludes(trackOpenTag, 'data-space-ui="progress-bar"')
})

Deno.test('ProgressBar: height defaults to 7px', () => {
  const html = renderToStaticMarkup(<ProgressBar />)

  assertStringIncludes(html, 'style="height:7px"')
})

Deno.test('ProgressBar: a numeric height is treated as pixels', () => {
  const html = renderToStaticMarkup(<ProgressBar height={12} />)

  assertStringIncludes(html, 'style="height:12px"')
})

Deno.test('ProgressBar: a string height is used verbatim', () => {
  const html = renderToStaticMarkup(<ProgressBar height='0.5rem' />)

  assertStringIncludes(html, 'style="height:0.5rem"')
})

Deno.test('ProgressBar: without label, the track is aria-hidden and has no role', () => {
  const html = renderToStaticMarkup(<ProgressBar />)

  assertStringIncludes(html, 'aria-hidden="true"')
  assertEquals(html.includes('role='), false)
  assertEquals(html.includes('aria-label='), false)
  assertEquals(html.includes('aria-valuemin='), false)
  assertEquals(html.includes('aria-valuemax='), false)
})

Deno.test('ProgressBar: with label, the track gets role=progressbar and declared bounds', () => {
  const html = renderToStaticMarkup(<ProgressBar label='Loading' />)

  assertStringIncludes(html, 'role="progressbar"')
  assertStringIncludes(html, 'aria-label="Loading"')
  assertStringIncludes(html, 'aria-valuemin="0"')
  assertStringIncludes(html, 'aria-valuemax="100"')
  assertEquals(html.includes('aria-hidden'), false)
})

Deno.test('ProgressBar: aria-valuenow is never rendered, with or without a timeout', () => {
  const withoutTimeout = renderToStaticMarkup(<ProgressBar label='Loading' />)
  const withTimeout = renderToStaticMarkup(<ProgressBar label='Loading' timeout={5000} />)

  assertEquals(withoutTimeout.includes('aria-valuenow'), false)
  assertEquals(withTimeout.includes('aria-valuenow'), false)
})

Deno.test('ProgressBar: without timeout, the fill has no data-timeout attribute', () => {
  const html = renderToStaticMarkup(<ProgressBar />)

  assertEquals(html.includes('data-timeout'), false)
})

Deno.test('ProgressBar: with timeout, the fill carries data-timeout and duration', () => {
  const html = renderToStaticMarkup(<ProgressBar timeout={3000} />)

  assertStringIncludes(html, 'data-timeout="3000"')
  assertStringIncludes(html, 'style="--space-ui-progress-duration:3000ms"')
})

Deno.test('ProgressBar: id and className are forwarded onto the track', () => {
  const html = renderToStaticMarkup(<ProgressBar id='save-progress' className='ui-progress' />)

  assertStringIncludes(html, 'id="save-progress"')
  assertStringIncludes(html, 'class="ui-progress"')
})

Deno.test('ProgressBar: a realistic multi-prop example renders well-formed markup', () => {
  const html = renderToStaticMarkup(
    <ProgressBar timeout={5000} height={4} label='Auto-dismissing' id='toast-progress' />,
  )

  assertStringIncludes(html, 'id="toast-progress"')
  assertStringIncludes(html, 'style="height:4px"')
  assertStringIncludes(html, 'role="progressbar"')
  assertStringIncludes(html, 'aria-label="Auto-dismissing"')
  assertStringIncludes(html, 'data-timeout="5000"')
  assertStringIncludes(html, '--space-ui-progress-duration:5000ms')
})
