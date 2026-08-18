import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { Link } from 'components/Link/index.ts'

Deno.test('Link: an internal link renders a plain anchor with no target/rel attributes', () => {
  const html = renderToStaticMarkup(<Link href='/about'>About</Link>)

  assertStringIncludes(html, 'href="/about"')
  assertEquals(html.includes('target='), false)
  assertEquals(html.includes('rel='), false)
})

Deno.test('Link: an external link adds target="_blank" and a safe rel', () => {
  const html = renderToStaticMarkup(
    <Link href='https://github.com/zanix-io' external>GitHub</Link>,
  )

  assertStringIncludes(html, 'target="_blank"')
  assertStringIncludes(html, 'rel="noopener noreferrer"')
})

Deno.test('Link: renders its children as visible content', () => {
  const html = renderToStaticMarkup(<Link href='/about'>About us</Link>)

  assertStringIncludes(html, '>About us</a>')
})

Deno.test('Link: an explicit label is applied as aria-label', () => {
  const html = renderToStaticMarkup(
    <Link href='/about' label='Learn more about Zanix'>About</Link>,
  )

  assertStringIncludes(html, 'aria-label="Learn more about Zanix"')
})

Deno.test('Link: without a label, no aria-label is rendered', () => {
  const html = renderToStaticMarkup(<Link href='/about'>About</Link>)

  assertEquals(html.includes('aria-label'), false)
})

Deno.test('Link: a className is forwarded onto the anchor element', () => {
  const html = renderToStaticMarkup(
    <Link href='/about' className='ui-link'>About</Link>,
  )

  assertStringIncludes(html, 'class="ui-link"')
})

Deno.test('Link: an explicit rel overrides the external-based default', () => {
  const html = renderToStaticMarkup(
    <Link href='/sponsored' external rel='sponsored nofollow'>Our partner</Link>,
  )

  assertStringIncludes(html, 'rel="sponsored nofollow"')
  assertEquals(html.includes('noopener noreferrer'), false)
})

Deno.test(
  'Link: onClick is wired onto the element (fires alongside navigation, not instead)',
  () => {
    // `renderToStaticMarkup` never serializes event handlers into the HTML string (React wires
    // them up at hydration, not as inline `onclick=""`) — so the plumbing is verified directly on
    // the element's own props instead, the same shape any real React tree would receive it in.
    const onClick = () => {}
    const element = Link({ href: '/about', onClick, children: 'About' })
    // `ReactElement.props` is typed `unknown` when the element type isn't parameterized — a real
    // structural limit (same category as `render.ts`'s own documented casts), not a shortcut: this
    // narrows to exactly the shape `render.ts` is known to pass through to `h('a', ...)`.
    const props = element.props as { onClick: typeof onClick }

    assertEquals(props.onClick, onClick)
  },
)
