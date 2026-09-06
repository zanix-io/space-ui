import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { Card } from 'components/Card/index.ts'
import { Image } from 'components/Image/index.ts'

Deno.test('Card: renders the root with data-space-ui="card" and the given type', () => {
  const html = renderToStaticMarkup(<Card type='article' content='Body text' />)

  assertStringIncludes(html, '<article')
  assertStringIncludes(html, 'data-space-ui="card"')
})

Deno.test('Card: defaults to a <div> root when type is omitted', () => {
  const html = renderToStaticMarkup(<Card content='Body text' />)

  assertStringIncludes(html, '<div')
  assertEquals(html.includes('<article'), false)
})

Deno.test('Card: id and className are forwarded onto the root', () => {
  const html = renderToStaticMarkup(<Card content='x' id='promo' className='ui-card' />)

  assertStringIncludes(html, 'id="promo"')
  assertStringIncludes(html, 'class="ui-card"')
})

Deno.test('Card: Grid receives the fixed 2x5 template, regardless of props', () => {
  const html = renderToStaticMarkup(<Card content='x' />)

  assertStringIncludes(html, 'data-space-ui="grid"')
  assertStringIncludes(html, 'grid-template-columns:1fr 1fr')
  assertStringIncludes(html, 'grid-template-rows:repeat(5, auto)')
})

Deno.test('Card: content-only renders a single card-content item, no placement', () => {
  const html = renderToStaticMarkup(<Card content='Just the body' />)

  assertStringIncludes(html, 'data-space-ui="grid-item"')
  assertStringIncludes(html, 'data-space-ui="card-content"')
  assertStringIncludes(html, 'Just the body')
  assertEquals(html.includes('<h2'), false)
  assertEquals(html.includes('<h5'), false)
  assertEquals(html.includes('card-footer'), false)
  assertEquals(html.includes('card-image'), false)
})

Deno.test('Card: no GridItem ever carries an inline grid-column/grid-row style', () => {
  const html = renderToStaticMarkup(
    <Card
      title='T'
      subtitle='S'
      content='C'
      footer={[{ href: '/x', children: 'Link' }]}
      visual={() => <Image src='a.jpg' alt='A' />}
    />,
  )

  // This is the whole point of the CSS-only design: nothing here should ever block a consumer's
  // media query from controlling layout via an inline style on the grid items.
  assertEquals(html.includes('grid-column'), false)
  assertEquals(html.includes('grid-row'), false)
})

Deno.test('Card: title/subtitle render as h2/h5, wrapped in their data-space-ui element', () => {
  const html = renderToStaticMarkup(<Card title='My Title' subtitle='My Subtitle' content='C' />)

  // data-space-ui lives on the wrapper div, not the h2/h5 themselves — that wrapper is the
  // element `display: contents` (via card.css) promotes to the effective grid participant, so
  // it's the correct element for `grid-area` to target. See render.ts's own doc.
  assertStringIncludes(html, '<div data-space-ui="card-title"><h2>My Title</h2></div>')
  assertStringIncludes(html, '<div data-space-ui="card-subtitle"><h5>My Subtitle</h5></div>')
})

Deno.test('Card: DOM order is always title, subtitle, content, footer, image', () => {
  const html = renderToStaticMarkup(
    <Card
      title='T'
      subtitle='S'
      content='C'
      footer={[{ href: '/x', children: 'F' }]}
      visual={() => <Image src='a.jpg' alt='A' />}
    />,
  )

  const iTitle = html.indexOf('card-title')
  const iSubtitle = html.indexOf('card-subtitle')
  const iContent = html.indexOf('card-content')
  const iFooter = html.indexOf('card-footer')
  const iImage = html.indexOf('card-image')

  assertEquals(iTitle < iSubtitle && iSubtitle < iContent && iContent < iFooter, true)
  assertEquals(iFooter < iImage, true)
})

Deno.test('Card: footer renders one real Link per entry, reusing Link exactly', () => {
  const html = renderToStaticMarkup(
    <Card content='C' footer={[{ href: '/a', children: 'A' }, { href: '/b', children: 'B' }]} />,
  )

  assertStringIncludes(html, 'data-space-ui="card-footer"')
  assertStringIncludes(html, 'data-space-ui="link"')
  assertStringIncludes(html, 'href="/a"')
  assertStringIncludes(html, 'href="/b"')
})

Deno.test('Card: without footer, no card-footer item is rendered', () => {
  const html = renderToStaticMarkup(<Card content='C' />)

  assertEquals(html.includes('card-footer'), false)
})

Deno.test('Card: visual reuses Image exactly, including sources and placeholder', () => {
  const html = renderToStaticMarkup(
    <Card
      content='C'
      visual={() => (
        <Image
          src='hero.jpg'
          alt='A hero image'
          placeholder='thumb.jpg'
          sources={[{ media: '(min-width: 1441px)', src: 'hero-dlg.jpg' }]}
        />
      )}
    />,
  )

  assertStringIncludes(html, 'data-space-ui="card-image"')
  assertStringIncludes(html, 'data-space-ui="image"')
  // `visual` composes the caller's OWN `Image` instance verbatim — a relative `src` here is left
  // unresolved, same root-barrel `Image` behavior `image.test.tsx` covers directly.
  assertStringIncludes(html, 'src="hero.jpg"')
  assertStringIncludes(html, 'alt="A hero image"')
  assertStringIncludes(html, 'style="background:url(thumb.jpg) center / cover no-repeat"')
  assertStringIncludes(html, '<picture>')
  assertStringIncludes(html, 'srcSet="hero-dlg.jpg"')
})

Deno.test('Card: without visual or image, no card-image item is rendered', () => {
  const html = renderToStaticMarkup(<Card content='C' />)

  assertEquals(html.includes('card-image'), false)
})

Deno.test('Card: visual is a plain render-prop — never composes Image internally', () => {
  const html = renderToStaticMarkup(
    <Card
      content='C'
      visual={() => <span data-testid='custom-visual'>*</span>}
    />,
  )

  assertStringIncludes(html, 'data-testid="custom-visual"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

// --- image (convenience sugar over the comet-safe, root-barrel Image) ------------------------

Deno.test(
  'Card: image builds the visual as Image({ ...image, alt: "" }) using the root-barrel Image',
  () => {
    const html = renderToStaticMarkup(
      <Card content='C' image={{ src: 'https://cdn.example.com/hero.jpg' }} />,
    )

    assertStringIncludes(html, 'data-space-ui="card-image"')
    assertStringIncludes(html, 'data-space-ui="image"')
    assertStringIncludes(html, 'src="https://cdn.example.com/hero.jpg"')
    assertStringIncludes(html, 'alt=""')
  },
)

Deno.test('Card: a relative image.src is left unresolved — no resolver injected', () => {
  const html = renderToStaticMarkup(<Card content='C' image={{ src: 'hero.jpg' }} />)

  assertStringIncludes(html, 'src="hero.jpg"')
})

Deno.test('Card: visual wins over image when both are given', () => {
  const html = renderToStaticMarkup(
    <Card
      content='C'
      image={{ src: 'hero.jpg' }}
      visual={() => <span data-testid='custom-visual'>*</span>}
    />,
  )

  assertStringIncludes(html, 'data-testid="custom-visual"')
  assertEquals(html.includes('data-space-ui="image"'), false)
})

// --- align -------------------------------------------------------------------------------------

Deno.test('Card: align="left" sets data-align="left" on the root', () => {
  const html = renderToStaticMarkup(
    <Card content='C' visual={() => <Image src='a.jpg' alt='A' />} align='left' />,
  )

  assertStringIncludes(html, 'data-align="left"')
})

Deno.test('Card: align="right" renders no data-align attribute (same as omitted)', () => {
  const html = renderToStaticMarkup(
    <Card content='C' visual={() => <Image src='a.jpg' alt='A' />} align='right' />,
  )

  assertEquals(html.includes('data-align'), false)
})

Deno.test('Card: without a visual, align still sets data-align (its own, independent prop)', () => {
  const html = renderToStaticMarkup(<Card content='C' align='left' />)

  // `align` is Card's own top-level layout decision now, independent of whether `visual` is given
  // — unlike the removed `image.align`, which only ever existed alongside a real image.
  assertStringIncludes(html, 'data-align="left"')
})

Deno.test('Card: without align, no data-align attribute is rendered', () => {
  const html = renderToStaticMarkup(<Card content='C' />)

  assertEquals(html.includes('data-align'), false)
})

// --- stacked -------------------------------------------------------------------------------------

Deno.test('Card: without stacked, no data-stacked attribute is rendered', () => {
  const html = renderToStaticMarkup(<Card content='C' />)

  assertEquals(html.includes('data-stacked'), false)
})

Deno.test('Card: stacked=true renders data-stacked="true"', () => {
  const html = renderToStaticMarkup(<Card content='C' stacked />)

  assertStringIncludes(html, 'data-stacked="true"')
})

Deno.test('Card: stacked=false renders data-stacked="false"', () => {
  const html = renderToStaticMarkup(<Card content='C' stacked={false} />)

  assertStringIncludes(html, 'data-stacked="false"')
})

Deno.test('Card: a realistic multi-prop example renders well-formed markup', () => {
  const html = renderToStaticMarkup(
    <Card
      type='article'
      title='A mountain retreat'
      subtitle='Weekend getaway'
      content='Description of the property goes here.'
      footer={[{ href: '/listings/cabin', children: 'View listing' }]}
      visual={() => <Image src='/images/cabin.jpg' alt='A cabin in the mountains' />}
      align='left'
      id='listing-42'
    />,
  )

  assertStringIncludes(html, '<article')
  assertStringIncludes(html, 'id="listing-42"')
  assertStringIncludes(html, 'data-align="left"')
  assertStringIncludes(html, 'card-title')
  assertStringIncludes(html, 'card-subtitle')
  assertStringIncludes(html, 'card-content')
  assertStringIncludes(html, 'card-footer')
  assertStringIncludes(html, 'card-image')
})
