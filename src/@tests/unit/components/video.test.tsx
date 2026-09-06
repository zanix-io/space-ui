import { must } from './dom-test-setup.ts'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { Video } from 'components/Video/index.ts'

// This is the comet-safe, root-barrel `Video` (`createVideo(h)`, no `resolveAssetHref` injected —
// `@zanix/space/video-source`'s own classification logic stays unconditional regardless, see
// `Video/render.ts`'s own module doc for why that's safe). A relative file/poster/track path is
// left exactly as given here, never resolved against `@zanix/space`'s own manifest. See
// `video-runtime.test.tsx` for the OTHER binding (`@zanix/space-ui/runtime/video`), which DOES
// inject `resolveAssetHref` and auto-resolves a relative path exactly as this component always
// used to, unconditionally.

// --- provider (YouTube/Vimeo) ---------------------------------------------------------------

Deno.test('Video: a YouTube URL renders an IFrame with the real embed URL', () => {
  const html = renderToStaticMarkup(<Video src='https://youtu.be/abcdefghijk' title='Song' />)

  assertStringIncludes(html, '<iframe')
  assertStringIncludes(html, 'src="https://www.youtube.com/embed/abcdefghijk"')
  assertStringIncludes(html, 'title="Song"')
})

Deno.test(
  'Video: youtube controls/autoPlay/muted/loop thread through the real embed URL',
  () => {
    const html = renderToStaticMarkup(
      <Video
        src='https://youtu.be/abcdefghijk'
        title='Song'
        autoPlay
        muted
        loop
        controls={false}
      />,
    )

    assertStringIncludes(html, 'autoplay=1')
    assertStringIncludes(html, 'mute=1')
    assertStringIncludes(html, 'loop=1')
    assertStringIncludes(html, 'playlist=abcdefghijk')
    assertStringIncludes(html, 'controls=0')
  },
)

Deno.test('Video: a Vimeo URL renders an IFrame with the real embed URL', () => {
  const html = renderToStaticMarkup(<Video src='https://vimeo.com/123456' title='Clip' />)

  assertStringIncludes(html, 'src="https://player.vimeo.com/video/123456"')
})

Deno.test('Video: vimeo muted uses the real "muted" param, never youtube\'s "mute"', () => {
  const html = renderToStaticMarkup(<Video src='https://vimeo.com/123456' title='Clip' muted />)

  assertStringIncludes(html, 'muted=1')
  assertEquals(html.includes('mute=1'), false)
})

Deno.test('Video: allow/allowFullscreen/loading/sandbox pass through to the embed IFrame', () => {
  const html = renderToStaticMarkup(
    <Video
      src='https://youtu.be/abcdefghijk'
      title='Song'
      allow='autoplay; fullscreen'
      allowFullscreen
      loading='lazy'
      sandbox='allow-scripts allow-same-origin'
    />,
  )

  assertStringIncludes(html, 'allow="autoplay; fullscreen"')
  assertStringIncludes(html, 'allowFullScreen=""')
  assertStringIncludes(html, 'loading="lazy"')
  assertStringIncludes(html, 'sandbox="allow-scripts allow-same-origin"')
})

// --- generic embeddable URL (Facebook/Instagram/Twitter/TikTok/other) ------------------------

Deno.test('Video: a generic embeddable URL renders an IFrame with src as-is', () => {
  const html = renderToStaticMarkup(
    <Video src='https://twitter.com/user/status/123456789' title='Tweet' autoPlay controls />,
  )

  assertStringIncludes(html, 'src="https://twitter.com/user/status/123456789"')
  // A third party's own query string is never rewritten — same conclusion buildProviderEmbedUrl's
  // own doc already reaches for this exact case.
  assertEquals(html.includes('autoplay'), false)
})

// --- file (local/CDN video) -------------------------------------------------------------------

Deno.test(
  'Video: a local file path renders a real <video>, UNRESOLVED — no resolver injected (root barrel)',
  () => {
    const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' />)
    assertStringIncludes(html, '<video')
    assertStringIncludes(html, 'src="clip.mp4"')
  },
)

// --- data-space-ui: own root for the file case, inherited from IFrame otherwise ------------

Deno.test('Video: the file case carries data-space-ui="video" on its own <video> root', () => {
  const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' />)

  assertStringIncludes(html, 'data-space-ui="video"')
})

Deno.test(
  'Video: the provider/iframe cases inherit data-space-ui="iframe" from IFrame — never "video"',
  () => {
    const providerHtml = renderToStaticMarkup(
      <Video src='https://youtu.be/abcdefghijk' title='Song' />,
    )
    const iframeHtml = renderToStaticMarkup(
      <Video src='https://twitter.com/user/status/123456789' title='Tweet' />,
    )

    assertStringIncludes(providerHtml, 'data-space-ui="iframe"')
    assertEquals(providerHtml.includes('data-space-ui="video"'), false)
    assertStringIncludes(iframeHtml, 'data-space-ui="iframe"')
    assertEquals(iframeHtml.includes('data-space-ui="video"'), false)
  },
)

Deno.test('Video: an absolute file URL passes through untouched, never rewritten', () => {
  const html = renderToStaticMarkup(<Video src='https://cdn.example.com/clip.mp4' title='D' />)

  assertStringIncludes(html, 'src="https://cdn.example.com/clip.mp4"')
})

Deno.test('Video: file-case native playback attributes are all forwarded verbatim', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      controls
      autoPlay
      loop
      muted
      playsInline
      preload='metadata'
    />,
  )

  assertStringIncludes(html, 'controls=""')
  assertStringIncludes(html, 'autoPlay=""')
  assertStringIncludes(html, 'loop=""')
  assertStringIncludes(html, 'muted=""')
  assertStringIncludes(html, 'playsInline=""')
  assertStringIncludes(html, 'preload="metadata"')
})

Deno.test(
  'Video: onError is wired onto the native <video> element (fires on native events, not serialized)',
  () => {
    // Same reasoning as `image.test.tsx`'s own `onLoad`/`onError` test: `renderToStaticMarkup`
    // never serializes event handlers into the HTML string — verified directly on the element's
    // own props instead.
    const onError = () => {}
    const element = Video({ src: 'clip.mp4', title: 'Demo', onError })
    const props = element?.props as { onError: typeof onError }

    assertEquals(props.onError, onError)
  },
)

Deno.test(
  'Video: onError has no effect on a YouTube (provider) source — IFrame does not expose it',
  () => {
    const onError = () => {}
    const element = Video({ src: 'https://youtu.be/abcdefghijk', title: 'Song', onError })
    const props = element?.props as { onError?: typeof onError }

    assertEquals(props.onError, undefined)
  },
)

Deno.test('Video: onError fires on a real DOM error event, not just wired in props', () => {
  // The tests above only prove `onError` reaches the element's props — they never prove React
  // itself wires it to a real `error` listener at the DOM level. Mounted into `happy-dom` (same
  // infra `menu.test.tsx` uses) to settle that empirically, not from memory of React's/Preact's
  // internals — see `video-preact.test.tsx`'s own equivalent for the Preact side of this same
  // question.
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  let fired = 0
  act(() => root.render(<Video src='clip.mp4' title='Demo' onError={() => fired++} />))

  const videoEl = must(container.querySelector('video'))
  act(() => videoEl.dispatchEvent(new Event('error')))

  assertEquals(fired, 1)

  act(() => root.unmount())
  container.remove()
})

Deno.test(
  'Video: poster passes through UNRESOLVED for the file case — no resolver injected (root barrel)',
  () => {
    const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' poster='poster.jpg' />)

    assertStringIncludes(html, 'poster="poster.jpg"')
  },
)

Deno.test('Video: an absolute poster URL passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Video src='clip.mp4' title='Demo' poster='https://cdn.example.com/poster.jpg' />,
  )

  assertStringIncludes(html, 'poster="https://cdn.example.com/poster.jpg"')
})

Deno.test('Video: without a poster, no poster attribute is rendered', () => {
  const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' />)

  assertEquals(html.includes('poster'), false)
})

Deno.test('Video: title becomes aria-label on the native <video>, not a title attribute', () => {
  const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo video' />)

  assertStringIncludes(html, 'aria-label="Demo video"')
  assertEquals(html.includes('title='), false)
})

Deno.test('Video: tracks render as real <track> elements, UNRESOLVED (root barrel)', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      tracks={[
        {
          src: 'captions-en.vtt',
          kind: 'captions',
          srcLang: 'en',
          label: 'English',
          default: true,
        },
      ]}
    />,
  )

  assertStringIncludes(html, '<track')
  assertStringIncludes(html, 'src="captions-en.vtt"')
  assertStringIncludes(html, 'kind="captions"')
  // React's own real output casing for this attribute — see render.ts's own doc comment.
  assertStringIncludes(html, 'srcLang="en"')
  assertStringIncludes(html, 'label="English"')
  assertStringIncludes(html, 'default=""')
})

Deno.test('Video: without tracks, no <track> element is rendered', () => {
  const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' />)

  assertEquals(html.includes('<track'), false)
})

// --- sources (responsive/format-fallback, file case only) ----------------------------------

Deno.test('Video: without sources, <video> keeps its own src attribute', () => {
  const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' />)

  assertStringIncludes(html, 'src="clip.mp4"')
  assertEquals(html.includes('<source'), false)
})

Deno.test('Video: an explicit empty sources array behaves identically to omitting it', () => {
  const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' sources={[]} />)

  assertStringIncludes(html, 'src="clip.mp4"')
  assertEquals(html.includes('<source'), false)
})

Deno.test(
  'Video: with sources, <video> carries no src attribute of its own (WHATWG resource-selection contract)',
  () => {
    const html = renderToStaticMarkup(
      <Video src='clip.mp4' title='Demo' sources={[{ src: 'clip-hd.mp4' }]} />,
    )

    // The <video> tag itself must have no src= — otherwise the browser would never even look at
    // the <source> children, per the WHATWG resource-selection algorithm (see render.ts's doc).
    const videoOpenTag = html.slice(0, html.indexOf('>') + 1)
    assertEquals(videoOpenTag.includes('src='), false)
  },
)

Deno.test('Video: a single source renders as a real <source> element', () => {
  const html = renderToStaticMarkup(
    <Video src='clip.mp4' title='Demo' sources={[{ src: 'clip-hd.mp4' }]} />,
  )

  assertStringIncludes(html, '<source src="clip-hd.mp4"/>')
})

Deno.test('Video: multiple sources preserve the given order', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      sources={[
        { media: '(min-width: 1441px)', src: 'clip-dlg.mp4' },
        { media: '(min-width: 721px)', src: 'clip-dmd.mp4' },
      ]}
    />,
  )

  const dlgIndex = html.indexOf('clip-dlg.mp4')
  const dmdIndex = html.indexOf('clip-dmd.mp4')
  assertEquals(dlgIndex > -1 && dmdIndex > dlgIndex, true)
})

Deno.test('Video: sources with media present renders the media attribute verbatim', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      sources={[{ media: '(min-width: 1441px)', src: 'clip-dlg.mp4' }]}
    />,
  )

  assertStringIncludes(html, '<source media="(min-width: 1441px)" src="clip-dlg.mp4"/>')
})

Deno.test('Video: sources with no media omits the attribute entirely', () => {
  const html = renderToStaticMarkup(
    <Video src='clip.mp4' title='Demo' sources={[{ src: 'clip.webm', type: 'video/webm' }]} />,
  )

  assertStringIncludes(html, '<source src="clip.webm" type="video/webm"/>')
})

Deno.test('Video: sources with type present renders the type attribute verbatim', () => {
  const html = renderToStaticMarkup(
    <Video src='clip.mp4' title='Demo' sources={[{ src: 'clip.webm', type: 'video/webm' }]} />,
  )

  assertStringIncludes(html, 'type="video/webm"')
})

Deno.test('Video: sources with no type omits the attribute entirely', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      sources={[{ media: '(min-width: 1441px)', src: 'clip-dlg.mp4' }]}
    />,
  )

  assertEquals(html.includes('type='), false)
})

Deno.test('Video: sources combining media and type together renders both verbatim', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      sources={[{ media: '(min-width: 1441px)', src: 'clip-dlg.webm', type: 'video/webm' }]}
    />,
  )

  assertStringIncludes(
    html,
    '<source media="(min-width: 1441px)" src="clip-dlg.webm" type="video/webm"/>',
  )
})

Deno.test('Video: an absolute source src passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      sources={[{ src: 'https://cdn.example.com/clip-hd.mp4' }]}
    />,
  )

  assertStringIncludes(html, 'src="https://cdn.example.com/clip-hd.mp4"')
})

Deno.test('Video: the top-level src is appended as the final fallback source', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      sources={[{ media: '(min-width: 1441px)', src: 'clip-dlg.mp4' }]}
    />,
  )

  const dlgIndex = html.indexOf('clip-dlg.mp4')
  const fallbackIndex = html.indexOf('<source src="clip.mp4"/>')
  assertEquals(dlgIndex > -1 && fallbackIndex > dlgIndex, true)
})

Deno.test('Video: sources combines correctly with poster', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      poster='poster.jpg'
      sources={[{ src: 'clip-hd.mp4' }]}
    />,
  )

  assertStringIncludes(html, 'poster="poster.jpg"')
  assertStringIncludes(html, '<source src="clip-hd.mp4"/>')
})

Deno.test('Video: sources combines correctly with tracks (sources render before tracks)', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      sources={[{ src: 'clip-hd.mp4' }]}
      tracks={[{ src: 'captions-en.vtt', kind: 'captions', srcLang: 'en' }]}
    />,
  )

  const sourceIndex = html.indexOf('<source')
  const trackIndex = html.indexOf('<track')
  assertEquals(sourceIndex > -1 && trackIndex > sourceIndex, true)
})

Deno.test('Video: sources has no effect on a YouTube (provider) source', () => {
  const html = renderToStaticMarkup(
    <Video
      src='https://youtu.be/abcdefghijk'
      title='Song'
      sources={[{ src: 'clip-hd.mp4' }]}
    />,
  )

  assertEquals(html.includes('<source'), false)
  assertStringIncludes(html, '<iframe')
})

Deno.test('Video: sources has no effect on a generic iframe source', () => {
  const html = renderToStaticMarkup(
    <Video
      src='https://twitter.com/user/status/123456789'
      title='Tweet'
      sources={[{ src: 'clip-hd.mp4' }]}
    />,
  )

  assertEquals(html.includes('<source'), false)
  assertStringIncludes(html, '<iframe')
})

Deno.test('Video: width/height/id/className pass through for both embed and file cases', () => {
  const embedHtml = renderToStaticMarkup(
    <Video
      src='https://youtu.be/abcdefghijk'
      title='Song'
      width={640}
      height={360}
      id='v1'
      className='ui-video'
    />,
  )
  assertStringIncludes(embedHtml, 'width="640"')
  assertStringIncludes(embedHtml, 'id="v1"')
  assertStringIncludes(embedHtml, 'class="ui-video"')

  const fileHtml = renderToStaticMarkup(
    <Video src='clip.mp4' title='Demo' width={640} height={360} id='v2' className='ui-video' />,
  )
  assertStringIncludes(fileHtml, 'width="640"')
  assertStringIncludes(fileHtml, 'id="v2"')
  assertStringIncludes(fileHtml, 'class="ui-video"')
})

// --- unknown (unsupported/invalid) --------------------------------------------------------------

Deno.test('Video: an unsupported .m3u8 source renders nothing', () => {
  const html = renderToStaticMarkup(<Video src='https://example.com/stream.m3u8' title='Live' />)

  assertEquals(html, '')
})

Deno.test('Video: an empty source renders nothing', () => {
  assertEquals(renderToStaticMarkup(<Video src='' title='x' />), '')
})

Deno.test('Video: a non-http(s) scheme (e.g. javascript:) renders nothing', () => {
  assertEquals(renderToStaticMarkup(<Video src='javascript:alert(1)' title='x' />), '')
})
