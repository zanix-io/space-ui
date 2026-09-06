import { assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { Image } from '../../../runtime/image.ts'

// This is the `@zanix/space`-dependent `@zanix/space-ui/runtime/image` binding — `resolveAssetHref`
// is injected (see `src/runtime/image.ts`'s own doc), so a relative `src`/`sources[].src`/
// `placeholder` auto-resolves exactly like every prior version of this component. Every OTHER
// behavior (bare `<img>` vs `<picture>`, decoding/loading/fetchPriority/..., placeholder rendering
// mechanism, id/className/data-space-ui placement) is identical to the root-barrel `Image` and
// already covered by `image.test.tsx` — this file only covers the resolver-specific delta.

Deno.test('Image (runtime): a relative src resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'photo.jpg': '/assets/photo-abc123.jpg' } })
  try {
    const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)
    assertStringIncludes(html, 'src="/assets/photo-abc123.jpg"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Image (runtime): a relative src falls back to /assets/<path> when unresolved', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertStringIncludes(html, 'src="/assets/photo.jpg"')
})

Deno.test('Image (runtime): sources[].src also resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'mobile.jpg': '/assets/mobile-abc123.jpg' } })
  try {
    const html = renderToStaticMarkup(
      <Image
        src='desktop.jpg'
        alt='A photo'
        sources={[{ media: '(max-width: 599px)', src: 'mobile.jpg' }]}
      />,
    )
    assertStringIncludes(html, 'srcSet="/assets/mobile-abc123.jpg"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Image (runtime): placeholder resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'thumb.jpg': '/assets/thumb-abc123.jpg' } })
  try {
    const html = renderToStaticMarkup(
      <Image src='photo.jpg' alt='A photo' placeholder='thumb.jpg' />,
    )
    assertStringIncludes(html, 'background:url(/assets/thumb-abc123.jpg)')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Image (runtime): an absolute src URL still passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Image src='https://cdn.example.com/photo.jpg' alt='A photo' />,
  )

  assertStringIncludes(html, 'src="https://cdn.example.com/photo.jpg"')
})
