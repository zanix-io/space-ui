import { assert, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { Video } from '../../../runtime/video.preact.ts'

// This is the `@zanix/space`-dependent `@zanix/space-ui/runtime/video/preact` binding —
// `resolveAssetHref` is injected (see `src/runtime/video.preact.ts`'s own doc). Every OTHER
// behavior is identical to the root-barrel `Video` and already covered by `video-preact.test.tsx`
// — this file only covers the resolver-specific delta.

Deno.test('Video (runtime, preact): a local file path resolves through resolveAssetHref', () => {
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

Deno.test(
  'Video (runtime, preact): a local file path falls back to /assets/<path> when unresolved',
  () => {
    const vnode = Video({ src: 'clip.mp4', title: 'Demo' })
    assert(vnode)
    assertStringIncludes(render(vnode), 'src="/assets/clip.mp4"')
  },
)

Deno.test('Video (runtime, preact): poster resolves through resolveAssetHref', () => {
  const vnode = Video({ src: 'clip.mp4', title: 'Demo', poster: 'poster.jpg' })
  assert(vnode)
  assertStringIncludes(render(vnode), 'poster="/assets/poster.jpg"')
})

Deno.test('Video (runtime, preact): a relative source src resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'clip-hd.mp4': '/assets/clip-hd-abc123.mp4' } })
  try {
    const vnode = Video({ src: 'clip.mp4', title: 'Demo', sources: [{ src: 'clip-hd.mp4' }] })
    assert(vnode)
    assertStringIncludes(render(vnode), 'src="/assets/clip-hd-abc123.mp4"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Video (runtime, preact): an absolute file URL still passes through untouched', () => {
  const vnode = Video({ src: 'https://cdn.example.com/clip.mp4', title: 'Demo' })
  assert(vnode)
  assertStringIncludes(render(vnode), 'src="https://cdn.example.com/clip.mp4"')
})
