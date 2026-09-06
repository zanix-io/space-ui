import { assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { Video } from '../../../runtime/video.ts'

// This is the `@zanix/space`-dependent `@zanix/space-ui/runtime/video` binding —
// `resolveAssetHref` is injected (see `src/runtime/video.ts`'s own doc), so a relative
// file/poster/track/sources[].src path auto-resolves exactly like every prior version of this
// component. Every OTHER behavior (YouTube/Vimeo/generic-iframe classification, native <video>
// attributes, sources ordering, data-space-ui placement) is identical to the root-barrel `Video`
// and already covered by `video.test.tsx` — this file only covers the resolver-specific delta.

Deno.test('Video (runtime): a local file path resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'clip.mp4': '/assets/clip-abc123.mp4' } })
  try {
    const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' />)
    assertStringIncludes(html, '<video')
    assertStringIncludes(html, 'src="/assets/clip-abc123.mp4"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Video (runtime): a local file path falls back to /assets/<path> when unresolved', () => {
  const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' />)

  assertStringIncludes(html, 'src="/assets/clip.mp4"')
})

Deno.test('Video (runtime): poster resolves through resolveAssetHref', () => {
  const html = renderToStaticMarkup(<Video src='clip.mp4' title='Demo' poster='poster.jpg' />)

  assertStringIncludes(html, 'poster="/assets/poster.jpg"')
})

Deno.test('Video (runtime): tracks resolve through resolveAssetHref', () => {
  const html = renderToStaticMarkup(
    <Video
      src='clip.mp4'
      title='Demo'
      tracks={[{ src: 'captions-en.vtt', kind: 'captions', srcLang: 'en' }]}
    />,
  )

  assertStringIncludes(html, 'src="/assets/captions-en.vtt"')
})

Deno.test('Video (runtime): a relative source src resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'clip-hd.mp4': '/assets/clip-hd-abc123.mp4' } })
  try {
    const html = renderToStaticMarkup(
      <Video src='clip.mp4' title='Demo' sources={[{ src: 'clip-hd.mp4' }]} />,
    )
    assertStringIncludes(html, 'src="/assets/clip-hd-abc123.mp4"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Video (runtime): an absolute file URL still passes through untouched', () => {
  const html = renderToStaticMarkup(<Video src='https://cdn.example.com/clip.mp4' title='D' />)

  assertStringIncludes(html, 'src="https://cdn.example.com/clip.mp4"')
})
