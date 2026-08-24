import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { IFrame } from 'components/IFrame/index.ts'

Deno.test('IFrame: renders a real <iframe> with src and title', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com/embed' title='Example embed' />,
  )

  assertStringIncludes(html, '<iframe')
  assertStringIncludes(html, 'src="https://example.com/embed"')
  assertStringIncludes(html, 'title="Example embed"')
})

Deno.test('IFrame: carries data-space-ui="iframe" on its own root element', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com/embed' title='Example embed' />,
  )

  assertStringIncludes(html, 'data-space-ui="iframe"')
})

Deno.test('IFrame: allow is forwarded verbatim', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com' title='t' allow='autoplay; fullscreen' />,
  )

  assertStringIncludes(html, 'allow="autoplay; fullscreen"')
})

Deno.test('IFrame: allowFullscreen renders the real allowfullscreen-equivalent attribute', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com' title='t' allowFullscreen />,
  )

  // Confirmed empirically (see `render.ts`'s own doc): React only recognizes `allowFullScreen`
  // (capital S) as a known DOM property for <iframe> — this asserts the real serialized output,
  // not the internal prop name `render.ts` happens to use to get there.
  assertStringIncludes(html, 'allowFullScreen=""')
})

Deno.test('IFrame: without allowFullscreen, no such attribute is rendered at all', () => {
  const html = renderToStaticMarkup(<IFrame src='https://example.com' title='t' />)

  assertEquals(html.toLowerCase().includes('fullscreen'), false)
})

Deno.test('IFrame: loading is forwarded verbatim', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com' title='t' loading='lazy' />,
  )

  assertStringIncludes(html, 'loading="lazy"')
})

Deno.test('IFrame: without loading, no attribute is rendered (native default applies)', () => {
  const html = renderToStaticMarkup(<IFrame src='https://example.com' title='t' />)

  assertEquals(html.includes('loading='), false)
})

Deno.test('IFrame: sandbox is forwarded verbatim', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com' title='t' sandbox='allow-scripts allow-same-origin' />,
  )

  assertStringIncludes(html, 'sandbox="allow-scripts allow-same-origin"')
})

Deno.test('IFrame: width and height accept numbers', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com' title='t' width={640} height={360} />,
  )

  assertStringIncludes(html, 'width="640"')
  assertStringIncludes(html, 'height="360"')
})

Deno.test('IFrame: width and height accept strings', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com' title='t' width='100%' height='auto' />,
  )

  assertStringIncludes(html, 'width="100%"')
  assertStringIncludes(html, 'height="auto"')
})

Deno.test('IFrame: without width/height, neither attribute is rendered', () => {
  const html = renderToStaticMarkup(<IFrame src='https://example.com' title='t' />)

  assertEquals(html.includes('width='), false)
  assertEquals(html.includes('height='), false)
})

Deno.test('IFrame: id and className are forwarded', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com' title='t' id='main-embed' className='ui-iframe' />,
  )

  assertStringIncludes(html, 'id="main-embed"')
  assertStringIncludes(html, 'class="ui-iframe"')
})

Deno.test('IFrame: children render as fallback content, same as the native element allows', () => {
  const html = renderToStaticMarkup(
    <IFrame src='https://example.com' title='t'>Your browser does not support iframes.</IFrame>,
  )

  assertStringIncludes(html, '>Your browser does not support iframes.</iframe>')
})

Deno.test('IFrame: without children, the element has no fallback content', () => {
  const html = renderToStaticMarkup(<IFrame src='https://example.com' title='t' />)

  assertStringIncludes(html, '></iframe>')
})

Deno.test(
  'IFrame: onLoad is wired onto the element (fires on the native load event, not serialized)',
  () => {
    // Same reasoning as `link.test.tsx`'s own `onClick` test: `renderToStaticMarkup` never
    // serializes event handlers into the HTML string — the plumbing is verified directly on the
    // element's own props instead.
    const onLoad = () => {}
    const element = IFrame({ src: 'https://example.com', title: 't', onLoad })
    const props = element.props as { onLoad: typeof onLoad }

    assertEquals(props.onLoad, onLoad)
  },
)
