import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { Icon } from 'components/Icon/index.preact.ts'

// Same behavior as `icon.test.tsx` (the React binding), verified independently against the Preact
// one — this pair is what actually proves `createIcon`'s shared logic (`render.ts`) behaves
// identically regardless of which renderer it's bound to, not just that each one compiles.
//
// Called as a plain function (`Icon({...})`), not via JSX (`<Icon ... />`): mixing React's and
// Preact's own JSX component types in the same project's type-checker is a known cross-ecosystem
// rough edge (confirmed empirically — the JSX form type-checks against the GLOBAL
// `compilerOptions.jsxImportSource`, `react` here, regardless of a per-file `@jsxImportSource`
// pragma, even though the pragma DOES correctly control the runtime transpile target). Since
// `Icon` is a plain function with no renderer-specific hook usage, calling it directly is exactly
// equivalent at runtime and sidesteps that gap entirely.

Deno.test(
  'Icon (preact): renders a sprite reference built from href + name, with the given viewBox/size',
  () => {
    const html = render(
      Icon({
        name: 'arrow-right',
        href: '/assets/icons/sprite.svg',
        viewBox: '0 0 24 24',
      }),
    )

    assertStringIncludes(html, 'viewBox="0 0 24 24"')
    assertStringIncludes(html, 'width="24"')
    assertStringIncludes(html, 'height="24"')
    assertStringIncludes(html, 'href="/assets/icons/sprite.svg#arrow-right"')
  },
)

Deno.test('Icon (preact): a custom size overrides the 24px default', () => {
  const html = render(
    Icon({
      name: 'logo',
      href: '/assets/icons/sprite.svg',
      viewBox: '0 0 64 64',
      size: 48,
    }),
  )

  assertStringIncludes(html, 'width="48"')
  assertStringIncludes(html, 'height="48"')
})

Deno.test(
  'Icon (preact): without a label, it is decorative — hidden from assistive tech, no img role',
  () => {
    const html = render(
      Icon({
        name: 'sparkle',
        href: '/assets/icons/sprite.svg',
        viewBox: '0 0 24 24',
      }),
    )

    assertStringIncludes(html, 'aria-hidden="true"')
    assertEquals(html.includes('role="img"'), false)
    assertEquals(html.includes('aria-label'), false)
  },
)

Deno.test(
  'Icon (preact): with a label, it is announced as an image — role="img" + aria-label',
  () => {
    const html = render(
      Icon({
        name: 'close',
        href: '/assets/icons/sprite.svg',
        viewBox: '0 0 24 24',
        label: 'Close dialog',
      }),
    )

    assertStringIncludes(html, 'role="img"')
    assertStringIncludes(html, 'aria-label="Close dialog"')
    assertEquals(html.includes('aria-hidden'), false)
  },
)

Deno.test('Icon (preact): a className is forwarded onto the svg element', () => {
  const html = render(
    Icon({
      name: 'star',
      href: '/assets/icons/sprite.svg',
      viewBox: '0 0 24 24',
      className: 'ui-icon ui-icon--accent',
    }),
  )

  assertStringIncludes(html, 'class="ui-icon ui-icon--accent"')
})

Deno.test('Icon (preact): an id is forwarded onto the svg element', () => {
  const html = render(
    Icon({
      name: 'star',
      href: '/assets/icons/sprite.svg',
      viewBox: '0 0 24 24',
      id: 'hero-star',
    }),
  )

  assertStringIncludes(html, 'id="hero-star"')
})
