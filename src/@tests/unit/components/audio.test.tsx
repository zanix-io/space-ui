import { must } from './dom-test-setup.ts'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { Audio } from 'components/Audio/index.ts'

// This is the comet-safe, root-barrel `Audio` (`createAudio(h)`, no `resolveAssetHref` injected) —
// a relative file/source path is left exactly as given here, never resolved against a manifest. See
// `audio-runtime.test.tsx` for the OTHER binding (`@zanix/space-ui/runtime/audio`), which DOES
// inject `resolveAssetHref` and auto-resolves a relative path.

Deno.test('Audio: a local file path renders a real <audio>, UNRESOLVED — no resolver injected', () => {
  const html = renderToStaticMarkup(<Audio src='voice-message.mp3' />)
  assertStringIncludes(html, '<audio')
  assertStringIncludes(html, 'src="voice-message.mp3"')
})

Deno.test('Audio: an absolute file URL passes through untouched, never rewritten', () => {
  const html = renderToStaticMarkup(<Audio src='https://cdn.example.com/clip.mp3' />)

  assertStringIncludes(html, 'src="https://cdn.example.com/clip.mp3"')
})

Deno.test('Audio: a blob: Object URL passes through untouched, same as an absolute URL', () => {
  // A real-world case this component must support: a chat app playing back an authenticated-fetch
  // voice message resolved into a `blob:` Object URL — `new URL('blob:...')` parses successfully
  // (see `render.ts`'s own doc), so it's treated as already-absolute, not looked up in a manifest.
  const html = renderToStaticMarkup(
    <Audio src='blob:https://example.com/9f1c1e2a-1234-4a3b-8b1d-abcdefabcdef' />,
  )

  assertStringIncludes(
    html,
    'src="blob:https://example.com/9f1c1e2a-1234-4a3b-8b1d-abcdefabcdef"',
  )
})

Deno.test('Audio: carries data-space-ui="audio" on its own root', () => {
  const html = renderToStaticMarkup(<Audio src='voice-message.mp3' />)

  assertStringIncludes(html, 'data-space-ui="audio"')
})

Deno.test('Audio: native playback attributes are all forwarded verbatim', () => {
  const html = renderToStaticMarkup(
    <Audio src='voice-message.mp3' controls autoPlay loop muted preload='metadata' />,
  )

  assertStringIncludes(html, 'controls=""')
  assertStringIncludes(html, 'autoPlay=""')
  assertStringIncludes(html, 'loop=""')
  assertStringIncludes(html, 'muted=""')
  assertStringIncludes(html, 'preload="metadata"')
})

Deno.test(
  'Audio: onError is wired onto the native <audio> element (fires on native events, not serialized)',
  () => {
    const onError = () => {}
    const element = Audio({ src: 'voice-message.mp3', onError })
    const props = element.props as { onError: typeof onError }

    assertEquals(props.onError, onError)
  },
)

Deno.test('Audio: onError fires on a real DOM error event, not just wired in props', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  let fired = 0
  act(() => root.render(<Audio src='voice-message.mp3' onError={() => fired++} />))

  const audioEl = must(container.querySelector('audio'))
  act(() => audioEl.dispatchEvent(new Event('error')))

  assertEquals(fired, 1)

  act(() => root.unmount())
  container.remove()
})

Deno.test(
  'Audio: crossOrigin forwards through unchanged — real fix for a confirmed session-cookie ' +
    "hazard (see AudioProps.crossOrigin's own doc)",
  () => {
    const html = renderToStaticMarkup(<Audio src='voice-message.mp3' crossOrigin='anonymous' />)

    assertStringIncludes(html, 'crossorigin="anonymous"')
  },
)

Deno.test('Audio: crossOrigin is omitted by default — never forced on a caller who never asked', () => {
  const html = renderToStaticMarkup(<Audio src='voice-message.mp3' />)

  assertEquals(html.includes('crossorigin'), false)
})

// --- sources (format-fallback) ----------------------------------------------------------------

Deno.test('Audio: without sources, <audio> keeps its own src attribute', () => {
  const html = renderToStaticMarkup(<Audio src='voice-message.mp3' />)

  assertStringIncludes(html, 'src="voice-message.mp3"')
  assertEquals(html.includes('<source'), false)
})

Deno.test('Audio: an explicit empty sources array behaves identically to omitting it', () => {
  const html = renderToStaticMarkup(<Audio src='voice-message.mp3' sources={[]} />)

  assertStringIncludes(html, 'src="voice-message.mp3"')
  assertEquals(html.includes('<source'), false)
})

Deno.test(
  'Audio: with sources, <audio> carries no src attribute of its own (WHATWG resource-selection contract)',
  () => {
    const html = renderToStaticMarkup(
      <Audio src='voice-message.mp3' sources={[{ src: 'voice-message.ogg' }]} />,
    )

    const audioOpenTag = html.slice(0, html.indexOf('>') + 1)
    assertEquals(audioOpenTag.includes('src='), false)
  },
)

Deno.test('Audio: a single source renders as a real <source> element', () => {
  const html = renderToStaticMarkup(
    <Audio src='voice-message.mp3' sources={[{ src: 'voice-message.ogg' }]} />,
  )

  assertStringIncludes(html, '<source src="voice-message.ogg"/>')
})

Deno.test('Audio: sources with media/type render both attributes verbatim', () => {
  const html = renderToStaticMarkup(
    <Audio
      src='voice-message.mp3'
      sources={[{ media: '(min-width: 721px)', src: 'clip.webm', type: 'audio/webm' }]}
    />,
  )

  assertStringIncludes(
    html,
    '<source media="(min-width: 721px)" src="clip.webm" type="audio/webm"/>',
  )
})

Deno.test('Audio: the top-level src is appended as the final fallback source', () => {
  const html = renderToStaticMarkup(
    <Audio src='voice-message.mp3' sources={[{ src: 'voice-message.ogg' }]} />,
  )

  const oggIndex = html.indexOf('voice-message.ogg')
  const fallbackIndex = html.indexOf('<source src="voice-message.mp3"/>')
  assertEquals(oggIndex > -1 && fallbackIndex > oggIndex, true)
})

Deno.test('Audio: multiple sources preserve the given order', () => {
  const html = renderToStaticMarkup(
    <Audio
      src='voice-message.mp3'
      sources={[{ src: 'clip.webm' }, { src: 'clip.ogg' }]}
    />,
  )

  const webmIndex = html.indexOf('clip.webm')
  const oggIndex = html.indexOf('clip.ogg')
  assertEquals(webmIndex > -1 && oggIndex > webmIndex, true)
})

Deno.test('Audio: an absolute source src passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Audio
      src='voice-message.mp3'
      sources={[{ src: 'https://cdn.example.com/voice-message.ogg' }]}
    />,
  )

  assertStringIncludes(html, 'src="https://cdn.example.com/voice-message.ogg"')
})

Deno.test('Audio: id/className pass through', () => {
  const html = renderToStaticMarkup(
    <Audio src='voice-message.mp3' id='a1' className='ui-audio' />,
  )

  assertStringIncludes(html, 'id="a1"')
  assertStringIncludes(html, 'class="ui-audio"')
})
