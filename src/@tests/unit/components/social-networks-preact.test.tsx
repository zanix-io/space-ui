import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { SocialNetworks } from 'components/SocialNetworks/index.preact.ts'
import type { SocialNetworkLink } from 'components/SocialNetworks/types.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why. The
// `assert(result, ...)` calls below narrow `VNode | null` to `VNode` for `render()` — a real,
// justified assertion (these test cases all pass a non-empty `links`, which never returns `null`),
// not a blind non-null cast.

const xLink: SocialNetworkLink = {
  name: 'x',
  url: 'https://x.com/zanix',
  icon: { href: '/assets/icons/sprite.svg', name: 'x', viewBox: '0 0 24 24' },
}

Deno.test('SocialNetworks (preact): renders one external, accessible link per entry', () => {
  const result = SocialNetworks({ links: [xLink] })
  assert(result, 'a non-empty links array must never render null')
  const html = render(result)

  assertStringIncludes(html, 'href="https://x.com/zanix"')
  assertStringIncludes(html, 'target="_blank"')
  assertStringIncludes(html, 'rel="noopener noreferrer"')
  assertStringIncludes(html, 'href="/assets/icons/sprite.svg#x"')
})

Deno.test('SocialNetworks (preact): defaults the accessible label to "Go to <name>"', () => {
  const result = SocialNetworks({ links: [xLink] })
  assert(result)
  const html = render(result)

  assertStringIncludes(html, 'aria-label="Go to x"')
})

Deno.test(
  'SocialNetworks (preact): a network using an image logo renders an img, not a sprite',
  () => {
    const result = SocialNetworks({
      links: [{ ...xLink, icon: { img: '/assets/logos/x.png' } }],
    })
    assert(result)
    const html = render(result)

    assertStringIncludes(html, 'src="/assets/logos/x.png"')
    assertStringIncludes(html, 'alt="x logo"')
  },
)

Deno.test('SocialNetworks (preact): the title defaults to "<name> logo", overridable', () => {
  const withDefault = SocialNetworks({ links: [xLink] })
  assert(withDefault)
  assertStringIncludes(render(withDefault), 'title="x logo"')

  const withOverride = SocialNetworks({ links: [{ ...xLink, tooltip: 'Follow us on X' }] })
  assert(withOverride)
  assertStringIncludes(render(withOverride), 'title="Follow us on X"')
})

Deno.test('SocialNetworks (preact): an explicit label overrides the default', () => {
  const result = SocialNetworks({ links: [{ ...xLink, label: 'Follow Zanix on X' }] })
  assert(result)
  const html = render(result)

  assertStringIncludes(html, 'aria-label="Follow Zanix on X"')
  assertEquals(html.includes('aria-label="Go to x"'), false)
})

Deno.test('SocialNetworks (preact): an empty links array renders nothing, not an error', () => {
  const result = SocialNetworks({ links: [] })

  assertEquals(result, null)
})

Deno.test('SocialNetworks (preact): a className is forwarded onto the list element', () => {
  const result = SocialNetworks({ links: [xLink], className: 'ui-social' })
  assert(result)
  const html = render(result)

  assertStringIncludes(html, 'class="ui-social"')
})
