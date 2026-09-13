import { assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { CatalogIcon } from '../../../runtime/catalog-icon.ts'

// This is the `@zanix/space`-dependent `@zanix/space-ui/runtime/catalog-icon` binding —
// `resolveAssetHref` is injected (see `src/runtime/catalog-icon.ts`'s own doc), so a relative
// `href` auto-resolves exactly like `./runtime/image` already does. Every OTHER behavior (per-name
// viewBox lookup, decorative-vs-labeled a11y, data-space-ui hook) is identical to the root-barrel
// `CatalogIcon` and already covered by `catalog-icon.test.tsx` — this file only covers the
// resolver-specific delta.

Deno.test('CatalogIcon (runtime): a relative href resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'icons/catalog.svg': '/assets/icons/catalog-abc123.svg' } })
  try {
    const html = renderToStaticMarkup(<CatalogIcon name='search' href='icons/catalog.svg' />)
    assertStringIncludes(html, 'href="/assets/icons/catalog-abc123.svg#search"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test(
  'CatalogIcon (runtime): a relative href falls back to /assets/<path> when unresolved',
  () => {
    const html = renderToStaticMarkup(<CatalogIcon name='search' href='icons/catalog.svg' />)

    assertStringIncludes(html, 'href="/assets/icons/catalog.svg#search"')
  },
)

Deno.test('CatalogIcon (runtime): an absolute href URL still passes through untouched', () => {
  const html = renderToStaticMarkup(
    <CatalogIcon name='search' href='https://cdn.example.com/icons/catalog.svg' />,
  )

  assertStringIncludes(html, 'href="https://cdn.example.com/icons/catalog.svg#search"')
})
