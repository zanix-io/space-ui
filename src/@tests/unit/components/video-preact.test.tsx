import { must } from './dom-test-setup.ts'
import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { render } from 'preact-render-to-string'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { Video } from 'components/Video/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why. The
// `assert(vnode, ...)` calls below narrow `VNode | null` to `VNode` for `render()` — a real,
// justified assertion (these test cases all pass a source `Video` is known to render), not a
// blind non-null cast — same reasoning `social-networks-preact.test.tsx`'s own `assert` calls use.

Deno.test('Video (preact): a YouTube URL renders an IFrame with the real embed URL', () => {
  const vnode = Video({ src: 'https://youtu.be/abcdefghijk', title: 'Song' })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, '<iframe')
  assertStringIncludes(html, 'src="https://www.youtube.com/embed/abcdefghijk"')
  assertStringIncludes(html, 'title="Song"')
})

Deno.test('Video (preact): youtube controls/autoPlay/muted/loop thread through the URL', () => {
  const vnode = Video({
    src: 'https://youtu.be/abcdefghijk',
    title: 'Song',
    autoPlay: true,
    muted: true,
    loop: true,
    controls: false,
  })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, 'autoplay=1')
  assertStringIncludes(html, 'mute=1')
  assertStringIncludes(html, 'loop=1')
  assertStringIncludes(html, 'playlist=abcdefghijk')
  assertStringIncludes(html, 'controls=0')
})

Deno.test('Video (preact): a Vimeo URL renders an IFrame with the real embed URL', () => {
  const vnode = Video({ src: 'https://vimeo.com/123456', title: 'Clip' })
  assert(vnode)

  assertStringIncludes(render(vnode), 'src="https://player.vimeo.com/video/123456"')
})

Deno.test('Video (preact): a generic embeddable URL renders an IFrame with src as-is', () => {
  const vnode = Video({
    src: 'https://twitter.com/user/status/123456789',
    title: 'Tweet',
    autoPlay: true,
  })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, 'src="https://twitter.com/user/status/123456789"')
  assertEquals(html.includes('autoplay'), false)
})

Deno.test('Video (preact): a local file path resolves via resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'clip.mp4': '/assets/clip-abc123.mp4' } })
  try {
    const vnode = Video({ src: 'clip.mp4', title: 'Demo' })
    assert(vnode)
    const html = render(vnode)
    assertStringIncludes(html, '<video')
    assertStringIncludes(html, 'src="/assets/clip-abc123.mp4"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

// --- data-space-ui: own root for the file case, inherited from IFrame otherwise ------------

Deno.test('Video (preact): the file case carries data-space-ui="video" on its own root', () => {
  const vnode = Video({ src: 'clip.mp4', title: 'Demo' })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, 'data-space-ui="video"')
})

Deno.test(
  'Video (preact): provider/iframe cases inherit data-space-ui="iframe" — never "video"',
  () => {
    const providerVnode = Video({ src: 'https://youtu.be/abcdefghijk', title: 'Song' })
    const iframeVnode = Video({
      src: 'https://twitter.com/user/status/123456789',
      title: 'Tweet',
    })
    assert(providerVnode)
    assert(iframeVnode)
    const providerHtml = render(providerVnode)
    const iframeHtml = render(iframeVnode)

    assertStringIncludes(providerHtml, 'data-space-ui="iframe"')
    assertEquals(providerHtml.includes('data-space-ui="video"'), false)
    assertStringIncludes(iframeHtml, 'data-space-ui="iframe"')
    assertEquals(iframeHtml.includes('data-space-ui="video"'), false)
  },
)

Deno.test('Video (preact): an absolute file URL passes through untouched', () => {
  const vnode = Video({ src: 'https://cdn.example.com/clip.mp4', title: 'Demo' })
  assert(vnode)

  assertStringIncludes(render(vnode), 'src="https://cdn.example.com/clip.mp4"')
})

Deno.test('Video (preact): file-case native playback attributes are all forwarded', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    controls: true,
    autoPlay: true,
    loop: true,
    muted: true,
    playsInline: true,
    preload: 'metadata',
  })
  assert(vnode)
  const html = render(vnode)

  // preact-render-to-string serializes every one of these as a bare, all-lowercase boolean
  // attribute (no `=""`, and `autoPlay` becomes `autoplay`) — same reasoning `iframe-preact.test`'s
  // own `disabled`/`allowFullScreen` comments already document for this renderer's real output.
  assertStringIncludes(html, 'controls')
  assertStringIncludes(html, 'autoplay')
  assertStringIncludes(html, 'loop')
  assertStringIncludes(html, 'muted')
  assertStringIncludes(html, 'playsinline')
  assertStringIncludes(html, 'preload="metadata"')
})

Deno.test('Video (preact): onError is wired onto the native <video> element', () => {
  const onError = () => {}
  const vnode = Video({ src: 'clip.mp4', title: 'Demo', onError })
  assert(vnode)

  // `render()` never serializes event handlers — see `image-preact.test.tsx`'s own `onLoad`/
  // `onError` cast, same reasoning.
  const props = vnode.props as unknown as { onError: typeof onError }
  assertEquals(props.onError, onError)
})

Deno.test('Video (preact): onError actually fires on a real DOM error event (real <video>)', () => {
  // Same reasoning as `video.test.tsx`'s own real-DOM test — proves Preact wires a camelCase
  // `onError` prop to a real `error` DOM listener too, not assumed from React's behavior. Preact
  // lowercases `on*` prop names internally to match the native DOM property (`onerror` exists on
  // `HTMLVideoElement`) before calling `addEventListener` — this confirms that holds in practice
  // for THIS component's actual `h()` call, not just for Preact in the abstract.
  const container = document.createElement('div')
  document.body.appendChild(container)

  let fired = 0
  act(() => renderDOM(Video({ src: 'clip.mp4', title: 'Demo', onError: () => fired++ }), container))

  const videoEl = must(container.querySelector('video'))
  act(() => {
    videoEl.dispatchEvent(new Event('error'))
  })

  assertEquals(fired, 1)

  act(() => renderDOM(null, container))
  container.remove()
})

Deno.test('Video (preact): onError has no effect on a YouTube (provider) source', () => {
  const onError = () => {}
  const vnode = Video({ src: 'https://youtu.be/abcdefghijk', title: 'Song', onError })
  assert(vnode)

  const props = vnode.props as unknown as { onError?: typeof onError }
  assertEquals(props.onError, undefined)
})

Deno.test('Video (preact): poster is resolved through resolveAssetHref', () => {
  const vnode = Video({ src: 'clip.mp4', title: 'Demo', poster: 'poster.jpg' })
  assert(vnode)

  assertStringIncludes(render(vnode), 'poster="/assets/poster.jpg"')
})

Deno.test('Video (preact): an absolute poster URL passes through untouched', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    poster: 'https://cdn.example.com/poster.jpg',
  })
  assert(vnode)

  assertStringIncludes(render(vnode), 'poster="https://cdn.example.com/poster.jpg"')
})

Deno.test('Video (preact): without a poster, no poster attribute is rendered', () => {
  const vnode = Video({ src: 'clip.mp4', title: 'Demo' })
  assert(vnode)

  assertEquals(render(vnode).includes('poster'), false)
})

Deno.test('Video (preact): title becomes aria-label on the native <video>', () => {
  const vnode = Video({ src: 'clip.mp4', title: 'Demo video' })
  assert(vnode)

  assertStringIncludes(render(vnode), 'aria-label="Demo video"')
})

Deno.test('Video (preact): tracks render as real <track> elements', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    tracks: [
      { src: 'captions-en.vtt', kind: 'captions', srcLang: 'en', label: 'English' },
    ],
  })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, '<track')
  assertStringIncludes(html, 'src="/assets/captions-en.vtt"')
  assertStringIncludes(html, 'srclang="en"')
})

// --- sources (responsive/format-fallback, file case only) ----------------------------------

Deno.test(
  'Video (preact): without sources, <video> keeps its own src attribute (unchanged behavior)',
  () => {
    const vnode = Video({ src: 'clip.mp4', title: 'Demo' })
    assert(vnode)
    const html = render(vnode)

    assertStringIncludes(html, 'src="/assets/clip.mp4"')
    assertEquals(html.includes('<source'), false)
  },
)

Deno.test('Video (preact): an explicit empty sources array behaves like omitting it', () => {
  const vnode = Video({ src: 'clip.mp4', title: 'Demo', sources: [] })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, 'src="/assets/clip.mp4"')
  assertEquals(html.includes('<source'), false)
})

Deno.test(
  'Video (preact): with sources, <video> carries no src attribute of its own',
  () => {
    const vnode = Video({ src: 'clip.mp4', title: 'Demo', sources: [{ src: 'clip-hd.mp4' }] })
    assert(vnode)
    const html = render(vnode)

    const videoOpenTag = html.slice(0, html.indexOf('>') + 1)
    assertEquals(videoOpenTag.includes('src='), false)
  },
)

Deno.test('Video (preact): a single source renders as a real <source> element', () => {
  const vnode = Video({ src: 'clip.mp4', title: 'Demo', sources: [{ src: 'clip-hd.mp4' }] })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, '<source src="/assets/clip-hd.mp4"/>')
})

Deno.test('Video (preact): multiple sources preserve the given order', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    sources: [
      { media: '(min-width: 1441px)', src: 'clip-dlg.mp4' },
      { media: '(min-width: 721px)', src: 'clip-dmd.mp4' },
    ],
  })
  assert(vnode)
  const html = render(vnode)

  const dlgIndex = html.indexOf('clip-dlg.mp4')
  const dmdIndex = html.indexOf('clip-dmd.mp4')
  assertEquals(dlgIndex > -1 && dmdIndex > dlgIndex, true)
})

Deno.test('Video (preact): sources with media present renders the media attribute verbatim', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    sources: [{ media: '(min-width: 1441px)', src: 'clip-dlg.mp4' }],
  })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, '<source media="(min-width: 1441px)" src="/assets/clip-dlg.mp4"/>')
})

Deno.test('Video (preact): sources with no media omits the attribute entirely', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    sources: [{ src: 'clip.webm', type: 'video/webm' }],
  })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, '<source src="/assets/clip.webm" type="video/webm"/>')
})

Deno.test('Video (preact): sources with type present renders the type attribute verbatim', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    sources: [{ src: 'clip.webm', type: 'video/webm' }],
  })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, 'type="video/webm"')
})

Deno.test('Video (preact): sources with no type omits the attribute entirely', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    sources: [{ media: '(min-width: 1441px)', src: 'clip-dlg.mp4' }],
  })
  assert(vnode)
  const html = render(vnode)

  assertEquals(html.includes('type='), false)
})

Deno.test('Video (preact): sources combining media and type together renders both verbatim', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    sources: [{ media: '(min-width: 1441px)', src: 'clip-dlg.webm', type: 'video/webm' }],
  })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(
    html,
    '<source media="(min-width: 1441px)" src="/assets/clip-dlg.webm" type="video/webm"/>',
  )
})

Deno.test('Video (preact): a relative source src resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'clip-hd.mp4': '/assets/clip-hd-abc123.mp4' } })
  try {
    const vnode = Video({ src: 'clip.mp4', title: 'Demo', sources: [{ src: 'clip-hd.mp4' }] })
    assert(vnode)
    assertStringIncludes(render(vnode), 'src="/assets/clip-hd-abc123.mp4"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Video (preact): an absolute source src passes through untouched', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    sources: [{ src: 'https://cdn.example.com/clip-hd.mp4' }],
  })
  assert(vnode)
  assertStringIncludes(render(vnode), 'src="https://cdn.example.com/clip-hd.mp4"')
})

Deno.test(
  'Video (preact): the top-level src is appended as the final, unconditional fallback source',
  () => {
    const vnode = Video({
      src: 'clip.mp4',
      title: 'Demo',
      sources: [{ media: '(min-width: 1441px)', src: 'clip-dlg.mp4' }],
    })
    assert(vnode)
    const html = render(vnode)

    const dlgIndex = html.indexOf('clip-dlg.mp4')
    const fallbackIndex = html.indexOf('<source src="/assets/clip.mp4"/>')
    assertEquals(dlgIndex > -1 && fallbackIndex > dlgIndex, true)
  },
)

Deno.test('Video (preact): sources combines correctly with poster', () => {
  const vnode = Video({
    src: 'clip.mp4',
    title: 'Demo',
    poster: 'poster.jpg',
    sources: [{ src: 'clip-hd.mp4' }],
  })
  assert(vnode)
  const html = render(vnode)

  assertStringIncludes(html, 'poster="/assets/poster.jpg"')
  assertStringIncludes(html, '<source src="/assets/clip-hd.mp4"/>')
})

Deno.test(
  'Video (preact): sources combines correctly with tracks (sources render before tracks)',
  () => {
    const vnode = Video({
      src: 'clip.mp4',
      title: 'Demo',
      sources: [{ src: 'clip-hd.mp4' }],
      tracks: [{ src: 'captions-en.vtt', kind: 'captions', srcLang: 'en' }],
    })
    assert(vnode)
    const html = render(vnode)

    const sourceIndex = html.indexOf('<source')
    const trackIndex = html.indexOf('<track')
    assertEquals(sourceIndex > -1 && trackIndex > sourceIndex, true)
  },
)

Deno.test('Video (preact): sources has no effect on a YouTube (provider) source', () => {
  const vnode = Video({
    src: 'https://youtu.be/abcdefghijk',
    title: 'Song',
    sources: [{ src: 'clip-hd.mp4' }],
  })
  assert(vnode)
  const html = render(vnode)

  assertEquals(html.includes('<source'), false)
  assertStringIncludes(html, '<iframe')
})

Deno.test('Video (preact): sources has no effect on a generic iframe source', () => {
  const vnode = Video({
    src: 'https://twitter.com/user/status/123456789',
    title: 'Tweet',
    sources: [{ src: 'clip-hd.mp4' }],
  })
  assert(vnode)
  const html = render(vnode)

  assertEquals(html.includes('<source'), false)
  assertStringIncludes(html, '<iframe')
})

Deno.test('Video (preact): an unsupported .m3u8 source renders nothing', () => {
  const vnode = Video({ src: 'https://example.com/stream.m3u8', title: 'Live' })

  assertEquals(vnode, null)
})

Deno.test('Video (preact): an empty source renders nothing', () => {
  assertEquals(Video({ src: '', title: 'x' }), null)
})
