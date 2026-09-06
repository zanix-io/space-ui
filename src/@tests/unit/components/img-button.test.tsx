import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { ImgButton } from 'components/ImgButton/index.ts'
import { Image } from 'components/Image/index.ts'

const icon = { href: '/sprite.svg', name: 'cart', viewBox: '0 0 24 24' }

// --- Link vs Button dispatch --------------------------------------------------------------

Deno.test('ImgButton: href present composes a real Link (<a>), no wrapping element', () => {
  const html = renderToStaticMarkup(<ImgButton href='/cart' label='View cart' icon={icon} />)

  assertStringIncludes(html, '<a href="/cart"')
  assertStringIncludes(html, 'data-space-ui="link"')
  assertEquals(html.includes('<div'), false)
  assertEquals(html.includes('<button'), false)
})

Deno.test('ImgButton: without href, composes a real Button (<button>), no wrapping element', () => {
  const html = renderToStaticMarkup(<ImgButton label='Save' icon={icon} onClick={() => {}} />)

  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'data-space-ui="button"')
  assertEquals(html.includes('<div'), false)
  assertEquals(html.includes('<a '), false)
})

Deno.test('ImgButton: onClick works on the Button branch (no href)', () => {
  const onClick = () => {}
  const element = ImgButton({ label: 'Save', icon, onClick })
  const props = element.props as { onClick: typeof onClick }

  assertEquals(props.onClick, onClick)
})

Deno.test('ImgButton: onClick also works on the Link branch (alongside navigation)', () => {
  const onClick = () => {}
  const element = ImgButton({ href: '/cart', label: 'View cart', icon, onClick })
  const props = element.props as { onClick: typeof onClick }

  assertEquals(props.onClick, onClick)
})

Deno.test('ImgButton: external/rel apply on the Link branch', () => {
  const html = renderToStaticMarkup(
    <ImgButton href='https://example.com' label='External' icon={icon} external />,
  )

  assertStringIncludes(html, 'target="_blank"')
  assertStringIncludes(html, 'rel="noopener noreferrer"')
})

Deno.test('ImgButton: disabled applies on the Button branch', () => {
  const html = renderToStaticMarkup(<ImgButton label='Save' icon={icon} disabled />)

  assertStringIncludes(html, 'disabled=""')
})

Deno.test('ImgButton: title is forwarded on both branches', () => {
  const linkHtml = renderToStaticMarkup(
    <ImgButton href='/cart' label='View cart' icon={icon} title='Cart' />,
  )
  const buttonHtml = renderToStaticMarkup(<ImgButton label='Save' icon={icon} title='Save now' />)

  assertStringIncludes(linkHtml, 'title="Cart"')
  assertStringIncludes(buttonHtml, 'title="Save now"')
})

// --- label as the sole accessible name --------------------------------------------------------

Deno.test('ImgButton: label becomes aria-label on the interactive element, required', () => {
  const html = renderToStaticMarkup(<ImgButton href='/cart' label='View cart' icon={icon} />)

  assertStringIncludes(html, 'aria-label="View cart"')
})

Deno.test('ImgButton: the icon inside never receives its own label — it is decorative', () => {
  const html = renderToStaticMarkup(<ImgButton href='/cart' label='View cart' icon={icon} />)

  assertStringIncludes(html, 'aria-hidden="true"')
  // Only one aria-label in the whole output — on the <a>, never duplicated onto the <svg>.
  const occurrences = html.split('aria-label').length - 1
  assertEquals(occurrences, 1)
})

// --- icon vs visual -------------------------------------------------------------------------

Deno.test('ImgButton: icon renders a real Icon, unmodified', () => {
  const html = renderToStaticMarkup(<ImgButton href='/x' label='X' icon={icon} />)

  assertStringIncludes(html, 'data-space-ui="icon"')
  assertStringIncludes(html, 'href="/sprite.svg#cart"')
  assertStringIncludes(html, 'viewBox="0 0 24 24"')
})

Deno.test('ImgButton: visual renders whatever caller-built element it is given', () => {
  const html = renderToStaticMarkup(
    <ImgButton href='/x' label='X' visual={() => <Image src='photo.jpg' alt='' />} />,
  )

  assertStringIncludes(html, 'data-space-ui="image"')
  // `visual` composes the caller's OWN `Image` instance verbatim — a relative `src` here is left
  // unresolved, same root-barrel `Image` behavior `image.test.tsx` covers directly.
  assertStringIncludes(html, 'src="photo.jpg"')
  assertStringIncludes(html, 'alt=""')
})

Deno.test(
  'ImgButton: visual composes sources and placeholder exactly as Image does standalone',
  () => {
    const html = renderToStaticMarkup(
      <ImgButton
        href='/x'
        label='X'
        visual={() => (
          <Image
            src='photo.jpg'
            alt=''
            placeholder='thumb.jpg'
            sources={[{ media: '(min-width: 1441px)', src: 'photo-dlg.jpg' }]}
          />
        )}
      />,
    )

    assertStringIncludes(html, '<picture>')
    assertStringIncludes(html, 'srcSet="photo-dlg.jpg"')
    assertStringIncludes(
      html,
      'style="background:url(thumb.jpg) center / cover no-repeat"',
    )
  },
)

Deno.test('ImgButton: icon wins over visual when both are given', () => {
  const html = renderToStaticMarkup(
    <ImgButton href='/x' label='X' icon={icon} visual={() => <Image src='photo.jpg' alt='' />} />,
  )

  assertStringIncludes(html, 'data-space-ui="icon"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

// --- image (convenience sugar over the comet-safe, root-barrel Image) ------------------------

Deno.test(
  'ImgButton: image builds the visual as Image({ ...image, alt: "" }) using the root-barrel Image',
  () => {
    const html = renderToStaticMarkup(
      <ImgButton href='/x' label='X' image={{ src: 'https://cdn.example.com/photo.jpg' }} />,
    )

    assertStringIncludes(html, 'data-space-ui="image"')
    assertStringIncludes(html, 'src="https://cdn.example.com/photo.jpg"')
    assertStringIncludes(html, 'alt=""')
  },
)

Deno.test('ImgButton: a relative image.src is left unresolved — no resolver injected', () => {
  const html = renderToStaticMarkup(<ImgButton href='/x' label='X' image={{ src: 'photo.jpg' }} />)

  assertStringIncludes(html, 'src="photo.jpg"')
})

Deno.test('ImgButton: icon wins over image when both are given', () => {
  const html = renderToStaticMarkup(
    <ImgButton href='/x' label='X' icon={icon} image={{ src: 'photo.jpg' }} />,
  )

  assertStringIncludes(html, 'data-space-ui="icon"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

Deno.test('ImgButton: visual wins over image when both are given', () => {
  const html = renderToStaticMarkup(
    <ImgButton
      href='/x'
      label='X'
      image={{ src: 'photo.jpg' }}
      visual={() => <span data-testid='custom-visual'>*</span>}
    />,
  )

  assertStringIncludes(html, 'data-testid="custom-visual"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

Deno.test('ImgButton: without icon, visual, or image, renders no visual element', () => {
  const html = renderToStaticMarkup(<ImgButton href='/x' label='X' />)

  assertEquals(html.includes('<svg'), false)
  assertEquals(html.includes('<img'), false)
})

Deno.test('ImgButton: visual is a plain render-prop — never composes Image internally', () => {
  const html = renderToStaticMarkup(
    <ImgButton
      href='/x'
      label='X'
      visual={() => <span data-testid='custom-visual'>*</span>}
    />,
  )

  assertStringIncludes(html, 'data-testid="custom-visual"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

// --- caption ---------------------------------------------------------------------------------

Deno.test('ImgButton: caption renders as a <span> after the visual, in order', () => {
  const html = renderToStaticMarkup(<ImgButton href='/x' label='X' icon={icon} caption='Cart' />)

  const svgIndex = html.indexOf('<svg')
  const spanIndex = html.indexOf('<span>Cart</span>')
  assertEquals(svgIndex > -1 && spanIndex > svgIndex, true)
})

Deno.test('ImgButton: without caption, no <span> is rendered', () => {
  const html = renderToStaticMarkup(<ImgButton href='/x' label='X' icon={icon} />)

  assertEquals(html.includes('<span'), false)
})

// --- className / no wrapping element ----------------------------------------------------------

Deno.test('ImgButton: className is forwarded onto the interactive element itself', () => {
  const linkHtml = renderToStaticMarkup(
    <ImgButton href='/x' label='X' icon={icon} className='ui-img-button' />,
  )
  const buttonHtml = renderToStaticMarkup(
    <ImgButton label='X' icon={icon} className='ui-img-button' />,
  )

  assertStringIncludes(linkHtml, 'class="ui-img-button"')
  assertStringIncludes(buttonHtml, 'class="ui-img-button"')
})

Deno.test('ImgButton: no responsive JS of any kind runs — output is identical across calls', () => {
  const first = renderToStaticMarkup(<ImgButton href='/x' label='X' icon={icon} />)
  const second = renderToStaticMarkup(<ImgButton href='/x' label='X' icon={icon} />)

  assertEquals(first, second)
})

Deno.test('ImgButton: a realistic multi-prop example renders well-formed markup', () => {
  const html = renderToStaticMarkup(
    <ImgButton
      href='/cart'
      label='View cart (3 items)'
      title='Cart'
      caption='Cart'
      icon={icon}
      className='ui-img-button'
    />,
  )

  assertStringIncludes(html, '<a href="/cart"')
  assertStringIncludes(html, 'aria-label="View cart (3 items)"')
  assertStringIncludes(html, 'title="Cart"')
  assertStringIncludes(html, 'class="ui-img-button"')
  assertStringIncludes(html, '<span>Cart</span>')
})
