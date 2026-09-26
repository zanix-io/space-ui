import { must } from './dom-test-setup.ts'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { render } from 'preact-render-to-string'
import { Audio } from 'components/Audio/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.
//
// This is the comet-safe, root-barrel `Audio` (`createAudio(h)`, no `resolveAssetHref` injected) —
// a relative file/source path is left exactly as given here. See `audio-runtime-preact.test.tsx`
// for the OTHER binding (`@zanix/space-ui/runtime/audio/preact`).

Deno.test('Audio (preact): a local file path renders a real <audio>, UNRESOLVED', () => {
  const vnode = Audio({ src: 'voice-message.mp3' })
  const html = render(vnode)
  assertStringIncludes(html, '<audio')
  assertStringIncludes(html, 'src="voice-message.mp3"')
})

Deno.test('Audio (preact): an absolute file URL passes through untouched', () => {
  const vnode = Audio({ src: 'https://cdn.example.com/clip.mp3' })

  assertStringIncludes(render(vnode), 'src="https://cdn.example.com/clip.mp3"')
})

Deno.test('Audio (preact): a blob: Object URL passes through untouched', () => {
  const vnode = Audio({ src: 'blob:https://example.com/9f1c1e2a-1234-4a3b-8b1d-abcdefabcdef' })

  assertStringIncludes(
    render(vnode),
    'src="blob:https://example.com/9f1c1e2a-1234-4a3b-8b1d-abcdefabcdef"',
  )
})

Deno.test('Audio (preact): carries data-space-ui="audio" on its own root', () => {
  const vnode = Audio({ src: 'voice-message.mp3' })

  assertStringIncludes(render(vnode), 'data-space-ui="audio"')
})

Deno.test('Audio (preact): native playback attributes are all forwarded', () => {
  const vnode = Audio({
    src: 'voice-message.mp3',
    controls: true,
    autoPlay: true,
    loop: true,
    muted: true,
    preload: 'metadata',
  })
  const html = render(vnode)

  // preact-render-to-string serializes each of these as a bare, all-lowercase boolean attribute —
  // same reasoning `video-preact.test.tsx`'s own equivalent already documents for this renderer.
  assertStringIncludes(html, 'controls')
  assertStringIncludes(html, 'autoplay')
  assertStringIncludes(html, 'loop')
  assertStringIncludes(html, 'muted')
  assertStringIncludes(html, 'preload="metadata"')
})

Deno.test('Audio (preact): onError is wired onto the native <audio> element', () => {
  const onError = () => {}
  const vnode = Audio({ src: 'voice-message.mp3', onError })

  const props = vnode.props as unknown as { onError: typeof onError }
  assertEquals(props.onError, onError)
})

Deno.test('Audio (preact): onError actually fires on a real DOM error event', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  let fired = 0
  act(() => renderDOM(Audio({ src: 'voice-message.mp3', onError: () => fired++ }), container))

  const audioEl = must(container.querySelector('audio'))
  act(() => {
    audioEl.dispatchEvent(new Event('error'))
  })

  assertEquals(fired, 1)

  act(() => renderDOM(null, container))
  container.remove()
})

Deno.test(
  'Audio (preact): crossOrigin forwards through unchanged — real fix for a confirmed ' +
    "session-cookie hazard (see AudioProps.crossOrigin's own doc)",
  () => {
    const vnode = Audio({ src: 'voice-message.mp3', crossOrigin: 'anonymous' })

    assertStringIncludes(render(vnode), 'crossorigin="anonymous"')
  },
)

Deno.test(
  'Audio (preact): crossOrigin is omitted by default — never forced on a caller who never asked',
  () => {
    const vnode = Audio({ src: 'voice-message.mp3' })

    assertEquals(render(vnode).includes('crossorigin'), false)
  },
)

// --- sources (format-fallback) ----------------------------------------------------------------

Deno.test('Audio (preact): without sources, <audio> keeps its own src attribute', () => {
  const vnode = Audio({ src: 'voice-message.mp3' })
  const html = render(vnode)

  assertStringIncludes(html, 'src="voice-message.mp3"')
  assertEquals(html.includes('<source'), false)
})

Deno.test('Audio (preact): an explicit empty sources array behaves like omitting it', () => {
  const vnode = Audio({ src: 'voice-message.mp3', sources: [] })
  const html = render(vnode)

  assertStringIncludes(html, 'src="voice-message.mp3"')
  assertEquals(html.includes('<source'), false)
})

Deno.test('Audio (preact): with sources, <audio> carries no src attribute of its own', () => {
  const vnode = Audio({ src: 'voice-message.mp3', sources: [{ src: 'voice-message.ogg' }] })
  const html = render(vnode)

  const audioOpenTag = html.slice(0, html.indexOf('>') + 1)
  assertEquals(audioOpenTag.includes('src='), false)
})

Deno.test('Audio (preact): a single source renders as a real <source> element', () => {
  const vnode = Audio({ src: 'voice-message.mp3', sources: [{ src: 'voice-message.ogg' }] })

  assertStringIncludes(render(vnode), '<source src="voice-message.ogg"/>')
})

Deno.test('Audio (preact): sources with media/type render both attributes verbatim', () => {
  const vnode = Audio({
    src: 'voice-message.mp3',
    sources: [{ media: '(min-width: 721px)', src: 'clip.webm', type: 'audio/webm' }],
  })

  assertStringIncludes(
    render(vnode),
    '<source media="(min-width: 721px)" src="clip.webm" type="audio/webm"/>',
  )
})

Deno.test(
  'Audio (preact): the top-level src is appended as the final, unconditional fallback source',
  () => {
    const vnode = Audio({
      src: 'voice-message.mp3',
      sources: [{ src: 'voice-message.ogg' }],
    })
    const html = render(vnode)

    const oggIndex = html.indexOf('voice-message.ogg')
    const fallbackIndex = html.indexOf('<source src="voice-message.mp3"/>')
    assertEquals(oggIndex > -1 && fallbackIndex > oggIndex, true)
  },
)

Deno.test('Audio (preact): an absolute source src passes through untouched', () => {
  const vnode = Audio({
    src: 'voice-message.mp3',
    sources: [{ src: 'https://cdn.example.com/voice-message.ogg' }],
  })

  assertStringIncludes(render(vnode), 'src="https://cdn.example.com/voice-message.ogg"')
})

Deno.test('Audio (preact): id/className pass through', () => {
  const vnode = Audio({ src: 'voice-message.mp3', id: 'a1', className: 'ui-audio' })
  const html = render(vnode)

  assertStringIncludes(html, 'id="a1"')
  assertStringIncludes(html, 'class="ui-audio"')
})
