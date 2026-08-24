import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { SocialNetworks } from 'components/SocialNetworks/index.ts'
import type { SocialNetworkLink } from 'components/SocialNetworks/types.ts'

const xLink: SocialNetworkLink = {
  name: 'x',
  url: 'https://x.com/zanix',
  icon: { href: '/assets/icons/sprite.svg', name: 'x', viewBox: '0 0 24 24' },
}

Deno.test('SocialNetworks: renders one external, accessible link per entry', () => {
  const html = renderToStaticMarkup(<SocialNetworks links={[xLink]} />)

  assertStringIncludes(html, 'href="https://x.com/zanix"')
  assertStringIncludes(html, 'target="_blank"')
  assertStringIncludes(html, 'rel="noopener noreferrer"')
  assertStringIncludes(html, 'href="/assets/icons/sprite.svg#x"')
})

Deno.test('SocialNetworks: defaults the accessible label to "Go to <name>"', () => {
  const html = renderToStaticMarkup(<SocialNetworks links={[xLink]} />)

  assertStringIncludes(html, 'aria-label="Go to x"')
})

Deno.test('SocialNetworks: a network using an image logo renders an img, not a sprite', () => {
  const html = renderToStaticMarkup(
    <SocialNetworks links={[{ ...xLink, icon: { img: '/assets/logos/x.png' } }]} />,
  )

  assertStringIncludes(html, 'src="/assets/logos/x.png"')
  assertStringIncludes(html, 'alt="x logo"')
  assertEquals(html.includes('<svg'), false)
})

Deno.test("SocialNetworks: an image logo's alt is overridable", () => {
  const html = renderToStaticMarkup(
    <SocialNetworks
      links={[{ ...xLink, icon: { img: '/assets/logos/x.png', alt: 'X (Twitter)' } }]}
    />,
  )

  assertStringIncludes(html, 'alt="X (Twitter)"')
})

Deno.test('SocialNetworks: the title defaults to "<name> logo", overridable per link', () => {
  const withDefault = renderToStaticMarkup(<SocialNetworks links={[xLink]} />)
  assertStringIncludes(withDefault, 'title="x logo"')

  const withOverride = renderToStaticMarkup(
    <SocialNetworks links={[{ ...xLink, tooltip: 'Follow us on X' }]} />,
  )
  assertStringIncludes(withOverride, 'title="Follow us on X"')
})

Deno.test('SocialNetworks: an explicit label overrides the default', () => {
  const html = renderToStaticMarkup(
    <SocialNetworks links={[{ ...xLink, label: 'Follow Zanix on X' }]} />,
  )

  assertStringIncludes(html, 'aria-label="Follow Zanix on X"')
  assertEquals(html.includes('aria-label="Go to x"'), false)
})

Deno.test('SocialNetworks: renders one entry per link, in order', () => {
  const links: SocialNetworkLink[] = [
    xLink,
    { name: 'instagram', url: 'https://instagram.com/zanix', icon: xLink.icon },
  ]
  const html = renderToStaticMarkup(<SocialNetworks links={links} />)

  const xIndex = html.indexOf('Go to x')
  const igIndex = html.indexOf('Go to instagram')
  assertEquals(xIndex > -1 && igIndex > -1 && xIndex < igIndex, true)
})

Deno.test('SocialNetworks: an empty links array renders nothing, not an empty list', () => {
  const html = renderToStaticMarkup(<SocialNetworks links={[]} />)

  assertEquals(html, '')
})

Deno.test('SocialNetworks: a className is forwarded onto the list element', () => {
  const html = renderToStaticMarkup(
    <SocialNetworks links={[xLink]} className='ui-social' />,
  )

  assertStringIncludes(html, 'class="ui-social"')
})

Deno.test('SocialNetworks: rel is overridable — e.g. for rel="me" identity verification', () => {
  const html = renderToStaticMarkup(
    <SocialNetworks links={[{ ...xLink, rel: 'me noopener noreferrer' }]} />,
  )

  assertStringIncludes(html, 'rel="me noopener noreferrer"')
  assertEquals(html.includes('rel="noopener noreferrer"'), false)
})

Deno.test('SocialNetworks: an image logo forwards loading when given', () => {
  const html = renderToStaticMarkup(
    <SocialNetworks
      links={[{ ...xLink, icon: { img: '/assets/logos/x.png', loading: 'lazy' } }]}
    />,
  )

  assertStringIncludes(html, 'loading="lazy"')
})

Deno.test('SocialNetworks: an image logo with no loading given renders no such attribute', () => {
  const html = renderToStaticMarkup(
    <SocialNetworks links={[{ ...xLink, icon: { img: '/assets/logos/x.png' } }]} />,
  )

  assertEquals(html.includes('loading='), false)
})
