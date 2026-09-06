import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { h } from 'preact'
import { ImgButton } from 'components/ImgButton/index.preact.ts'
import { Image } from 'components/Image/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.

const icon = { href: '/sprite.svg', name: 'cart', viewBox: '0 0 24 24' }

// --- Link vs Button dispatch --------------------------------------------------------------

Deno.test('ImgButton (preact): href present composes a real Link (<a>), no wrapper', () => {
  const html = render(ImgButton({ href: '/cart', label: 'View cart', icon }))

  assertStringIncludes(html, '<a href="/cart"')
  assertStringIncludes(html, 'data-space-ui="link"')
  assertEquals(html.includes('<div'), false)
  assertEquals(html.includes('<button'), false)
})

Deno.test('ImgButton (preact): without href, composes a real Button (<button>), no wrapper', () => {
  const html = render(ImgButton({ label: 'Save', icon, onClick: () => {} }))

  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'data-space-ui="button"')
  assertEquals(html.includes('<div'), false)
  assertEquals(html.includes('<a '), false)
})

Deno.test('ImgButton (preact): onClick works on the Button branch (no href)', () => {
  const onClick = () => {}
  const vnode = ImgButton({ label: 'Save', icon, onClick })
  const props = vnode.props as unknown as { onClick: typeof onClick }

  assertEquals(props.onClick, onClick)
})

Deno.test('ImgButton (preact): onClick also works on the Link branch', () => {
  const onClick = () => {}
  const vnode = ImgButton({ href: '/cart', label: 'View cart', icon, onClick })
  const props = vnode.props as unknown as { onClick: typeof onClick }

  assertEquals(props.onClick, onClick)
})

Deno.test('ImgButton (preact): external/rel apply on the Link branch', () => {
  const html = render(
    ImgButton({ href: 'https://example.com', label: 'External', icon, external: true }),
  )

  assertStringIncludes(html, 'target="_blank"')
  assertStringIncludes(html, 'rel="noopener noreferrer"')
})

Deno.test('ImgButton (preact): disabled applies on the Button branch', () => {
  const html = render(ImgButton({ label: 'Save', icon, disabled: true }))

  assertStringIncludes(html, 'disabled')
})

Deno.test('ImgButton (preact): title is forwarded on both branches', () => {
  const linkHtml = render(ImgButton({ href: '/cart', label: 'View cart', icon, title: 'Cart' }))
  const buttonHtml = render(ImgButton({ label: 'Save', icon, title: 'Save now' }))

  assertStringIncludes(linkHtml, 'title="Cart"')
  assertStringIncludes(buttonHtml, 'title="Save now"')
})

// --- label as the sole accessible name --------------------------------------------------------

Deno.test('ImgButton (preact): label becomes aria-label on the interactive element', () => {
  const html = render(ImgButton({ href: '/cart', label: 'View cart', icon }))

  assertStringIncludes(html, 'aria-label="View cart"')
})

Deno.test('ImgButton (preact): the icon inside never receives its own label', () => {
  const html = render(ImgButton({ href: '/cart', label: 'View cart', icon }))

  assertStringIncludes(html, 'aria-hidden="true"')
  const occurrences = html.split('aria-label').length - 1
  assertEquals(occurrences, 1)
})

// --- icon vs visual -------------------------------------------------------------------------

Deno.test('ImgButton (preact): icon renders a real Icon, unmodified', () => {
  const html = render(ImgButton({ href: '/x', label: 'X', icon }))

  assertStringIncludes(html, 'data-space-ui="icon"')
  assertStringIncludes(html, 'href="/sprite.svg#cart"')
  assertStringIncludes(html, 'viewBox="0 0 24 24"')
})

Deno.test('ImgButton (preact): visual renders whatever caller-built element it is given', () => {
  const html = render(
    ImgButton({ href: '/x', label: 'X', visual: () => Image({ src: 'photo.jpg', alt: '' }) }),
  )

  assertStringIncludes(html, 'data-space-ui="image"')
  // `visual` composes the caller's OWN `Image` instance verbatim — a relative `src` here is left
  // unresolved, same root-barrel `Image` behavior `image-preact.test.tsx` covers directly.
  assertStringIncludes(html, 'src="photo.jpg"')
  // Preact's own already-documented quirk: an empty-string attribute value serializes bare, with
  // no `=""` at all — see `image-preact.test.tsx`'s own test for the same behavior on Image alone.
  assertEquals(html.includes('alt='), false)
  assertStringIncludes(html, ' alt ')
})

Deno.test(
  'ImgButton (preact): visual composes sources and placeholder exactly as Image does standalone',
  () => {
    const html = render(
      ImgButton({
        href: '/x',
        label: 'X',
        visual: () =>
          Image({
            src: 'photo.jpg',
            alt: '',
            placeholder: 'thumb.jpg',
            sources: [{ media: '(min-width: 1441px)', src: 'photo-dlg.jpg' }],
          }),
      }),
    )

    assertStringIncludes(html, '<picture>')
    assertStringIncludes(html, 'srcset="photo-dlg.jpg"')
    assertStringIncludes(
      html,
      'style="background:url(thumb.jpg) center / cover no-repeat;"',
    )
  },
)

Deno.test('ImgButton (preact): icon wins over visual when both are given', () => {
  const html = render(
    ImgButton({
      href: '/x',
      label: 'X',
      icon,
      visual: () => Image({ src: 'photo.jpg', alt: '' }),
    }),
  )

  assertStringIncludes(html, 'data-space-ui="icon"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

// --- image (convenience sugar over the comet-safe, root-barrel Image) ------------------------

Deno.test(
  'ImgButton (preact): image builds the visual as Image({ ...image, alt: "" }) using the ' +
    'root-barrel Image',
  () => {
    const html = render(
      ImgButton({
        href: '/x',
        label: 'X',
        image: { src: 'https://cdn.example.com/photo.jpg' },
      }),
    )

    assertStringIncludes(html, 'data-space-ui="image"')
    assertStringIncludes(html, 'src="https://cdn.example.com/photo.jpg"')
  },
)

Deno.test('ImgButton (preact): a relative image.src is left unresolved — no resolver injected', () => {
  const html = render(ImgButton({ href: '/x', label: 'X', image: { src: 'photo.jpg' } }))

  assertStringIncludes(html, 'src="photo.jpg"')
})

Deno.test('ImgButton (preact): icon wins over image when both are given', () => {
  const html = render(
    ImgButton({ href: '/x', label: 'X', icon, image: { src: 'photo.jpg' } }),
  )

  assertStringIncludes(html, 'data-space-ui="icon"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

Deno.test('ImgButton (preact): visual wins over image when both are given', () => {
  const html = render(
    ImgButton({
      href: '/x',
      label: 'X',
      image: { src: 'photo.jpg' },
      visual: () => h('span', { 'data-testid': 'custom-visual' }, '*'),
    }),
  )

  assertStringIncludes(html, 'data-testid="custom-visual"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

Deno.test('ImgButton (preact): without icon, visual, or image, renders no visual element', () => {
  const html = render(ImgButton({ href: '/x', label: 'X' }))

  assertEquals(html.includes('<svg'), false)
  assertEquals(html.includes('<img'), false)
})

Deno.test(
  'ImgButton (preact): visual is a plain render-prop — never composes Image internally',
  () => {
    const html = render(
      ImgButton({
        href: '/x',
        label: 'X',
        visual: () => h('span', { 'data-testid': 'custom-visual' }, '*'),
      }),
    )

    assertStringIncludes(html, 'data-testid="custom-visual"')
    assertEquals(html.includes('data-space-ui="image"'), false)
  },
)

// --- caption ---------------------------------------------------------------------------------

Deno.test('ImgButton (preact): caption renders as a <span> after the visual, in order', () => {
  const html = render(ImgButton({ href: '/x', label: 'X', icon, caption: 'Cart' }))

  const svgIndex = html.indexOf('<svg')
  const spanIndex = html.indexOf('<span>Cart</span>')
  assertEquals(svgIndex > -1 && spanIndex > svgIndex, true)
})

Deno.test('ImgButton (preact): without caption, no <span> is rendered', () => {
  const html = render(ImgButton({ href: '/x', label: 'X', icon }))

  assertEquals(html.includes('<span'), false)
})

// --- className / no wrapping element ----------------------------------------------------------

Deno.test('ImgButton (preact): className is forwarded onto the interactive element itself', () => {
  const linkHtml = render(ImgButton({ href: '/x', label: 'X', icon, className: 'ui-img-button' }))
  const buttonHtml = render(ImgButton({ label: 'X', icon, className: 'ui-img-button' }))

  assertStringIncludes(linkHtml, 'class="ui-img-button"')
  assertStringIncludes(buttonHtml, 'class="ui-img-button"')
})

Deno.test('ImgButton (preact): a realistic multi-prop example renders well-formed markup', () => {
  const html = render(
    ImgButton({
      href: '/cart',
      label: 'View cart (3 items)',
      title: 'Cart',
      caption: 'Cart',
      icon,
      className: 'ui-img-button',
    }),
  )

  assertStringIncludes(html, '<a href="/cart"')
  assertStringIncludes(html, 'aria-label="View cart (3 items)"')
  assertStringIncludes(html, 'title="Cart"')
  assertStringIncludes(html, 'class="ui-img-button"')
  assertStringIncludes(html, '<span>Cart</span>')
})
