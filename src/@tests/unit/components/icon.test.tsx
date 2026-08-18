import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { Icon } from 'components/Icon/index.ts'

Deno.test(
  'Icon: renders a sprite reference built from href + name, with the given viewBox/size',
  () => {
    const html = renderToStaticMarkup(
      <Icon
        name='arrow-right'
        href='/assets/icons/sprite.svg'
        viewBox='0 0 24 24'
      />,
    )

    assertStringIncludes(html, 'viewBox="0 0 24 24"')
    assertStringIncludes(html, 'width="24"')
    assertStringIncludes(html, 'height="24"')
    assertStringIncludes(html, 'href="/assets/icons/sprite.svg#arrow-right"')
  },
)

Deno.test(
  'Icon: a custom size overrides the 24px default, applied to both width and height',
  () => {
    const html = renderToStaticMarkup(
      <Icon
        name='logo'
        href='/assets/icons/sprite.svg'
        viewBox='0 0 64 64'
        size={48}
      />,
    )

    assertStringIncludes(html, 'width="48"')
    assertStringIncludes(html, 'height="48"')
  },
)

Deno.test(
  'Icon: without a label, it is decorative — hidden from assistive tech, no img role',
  () => {
    const html = renderToStaticMarkup(
      <Icon
        name='sparkle'
        href='/assets/icons/sprite.svg'
        viewBox='0 0 24 24'
      />,
    )

    assertStringIncludes(html, 'aria-hidden="true"')
    assertEquals(html.includes('role="img"'), false)
    assertEquals(html.includes('aria-label'), false)
  },
)

Deno.test(
  'Icon: with a label, it is announced as an image — role="img" + aria-label, no aria-hidden',
  () => {
    const html = renderToStaticMarkup(
      <Icon
        name='close'
        href='/assets/icons/sprite.svg'
        viewBox='0 0 24 24'
        label='Close dialog'
      />,
    )

    assertStringIncludes(html, 'role="img"')
    assertStringIncludes(html, 'aria-label="Close dialog"')
    assertEquals(html.includes('aria-hidden'), false)
  },
)

Deno.test('Icon: a className is forwarded onto the svg element', () => {
  const html = renderToStaticMarkup(
    <Icon
      name='star'
      href='/assets/icons/sprite.svg'
      viewBox='0 0 24 24'
      className='ui-icon ui-icon--accent'
    />,
  )

  assertStringIncludes(html, 'class="ui-icon ui-icon--accent"')
})

Deno.test('Icon: an id is forwarded onto the svg element', () => {
  const html = renderToStaticMarkup(
    <Icon name='star' href='/assets/icons/sprite.svg' viewBox='0 0 24 24' id='hero-star' />,
  )

  assertStringIncludes(html, 'id="hero-star"')
})
