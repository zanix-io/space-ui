import { assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { CatalogIcon } from '../../../runtime/catalog-icon.preact.ts'

// This is the `@zanix/space`-dependent `@zanix/space-ui/runtime/catalog-icon/preact` binding —
// same resolver-specific delta `catalog-icon-runtime.test.tsx` (React) covers, verified
// independently against the Preact one — proves `createCatalogIcon`'s shared `resolveHref`
// injection (`render.ts`) behaves identically regardless of which renderer it's bound to. Called
// as a plain function, not via JSX — same reasoning as `catalog-icon-preact.test.tsx`'s own doc.

Deno.test('CatalogIcon (runtime, preact): a relative href resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'icons/catalog.svg': '/assets/icons/catalog-abc123.svg' } })
  try {
    const html = render(CatalogIcon({ name: 'search', href: 'icons/catalog.svg' }))
    assertStringIncludes(html, 'href="/assets/icons/catalog-abc123.svg#search"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test(
  'CatalogIcon (runtime, preact): a relative href falls back to /assets/<path> when unresolved',
  () => {
    const html = render(CatalogIcon({ name: 'search', href: 'icons/catalog.svg' }))

    assertStringIncludes(html, 'href="/assets/icons/catalog.svg#search"')
  },
)

Deno.test(
  'CatalogIcon (runtime, preact): an absolute href URL still passes through untouched',
  () => {
    const html = render(
      CatalogIcon({ name: 'search', href: 'https://cdn.example.com/icons/catalog.svg' }),
    )

    assertStringIncludes(html, 'href="https://cdn.example.com/icons/catalog.svg#search"')
  },
)
