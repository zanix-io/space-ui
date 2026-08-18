import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { Link } from 'components/Link/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.

Deno.test(
  'Link (preact): an internal link renders a plain anchor with no target/rel attributes',
  () => {
    const html = render(Link({ href: '/about', children: 'About' }))

    assertStringIncludes(html, 'href="/about"')
    assertEquals(html.includes('target='), false)
    assertEquals(html.includes('rel='), false)
  },
)

Deno.test('Link (preact): an external link adds target="_blank" and a safe rel', () => {
  const html = render(
    Link({ href: 'https://github.com/zanix-io', external: true, children: 'GitHub' }),
  )

  assertStringIncludes(html, 'target="_blank"')
  assertStringIncludes(html, 'rel="noopener noreferrer"')
})

Deno.test('Link (preact): renders its children as visible content', () => {
  const html = render(Link({ href: '/about', children: 'About us' }))

  assertStringIncludes(html, '>About us</a>')
})

Deno.test('Link (preact): an explicit label is applied as aria-label', () => {
  const html = render(
    Link({ href: '/about', label: 'Learn more about Zanix', children: 'About' }),
  )

  assertStringIncludes(html, 'aria-label="Learn more about Zanix"')
})

Deno.test('Link (preact): a className is forwarded onto the anchor element', () => {
  const html = render(Link({ href: '/about', className: 'ui-link', children: 'About' }))

  assertStringIncludes(html, 'class="ui-link"')
})

Deno.test('Link (preact): an explicit rel overrides the external-based default', () => {
  const html = render(
    Link({
      href: '/sponsored',
      external: true,
      rel: 'sponsored nofollow',
      children: 'Our partner',
    }),
  )

  assertStringIncludes(html, 'rel="sponsored nofollow"')
  assertEquals(html.includes('noopener noreferrer'), false)
})

Deno.test('Link (preact): onClick is wired onto the element', () => {
  // Same reasoning as the React test's own comment — event handlers never serialize into the
  // HTML string, so this is verified directly on the vnode's own props.
  const onClick = () => {}
  const vnode = Link({ href: '/about', onClick, children: 'About' })
  // `VNode<P = {}>`'s default `P` only knows about `children` — same structural limit as the
  // React test's own cast, see its comment.
  const props = vnode.props as unknown as { onClick: typeof onClick }

  assertEquals(props.onClick, onClick)
})
