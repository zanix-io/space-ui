import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { IFrame } from 'components/IFrame/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.

Deno.test('IFrame (preact): renders a real <iframe> with src and title', () => {
  const html = render(IFrame({ src: 'https://example.com/embed', title: 'Example embed' }))

  assertStringIncludes(html, '<iframe')
  assertStringIncludes(html, 'src="https://example.com/embed"')
  assertStringIncludes(html, 'title="Example embed"')
})

Deno.test('IFrame (preact): carries data-space-ui="iframe" on its own root element', () => {
  const html = render(IFrame({ src: 'https://example.com/embed', title: 'Example embed' }))

  assertStringIncludes(html, 'data-space-ui="iframe"')
})

Deno.test('IFrame (preact): allow is forwarded verbatim', () => {
  const html = render(
    IFrame({ src: 'https://example.com', title: 't', allow: 'autoplay; fullscreen' }),
  )

  assertStringIncludes(html, 'allow="autoplay; fullscreen"')
})

Deno.test('IFrame (preact): allowFullscreen renders as a bare boolean attribute', () => {
  const html = render(IFrame({ src: 'https://example.com', title: 't', allowFullscreen: true }))

  // preact-render-to-string serializes boolean-true attributes bare (no `=""`), unlike React's
  // `renderToStaticMarkup` — see `iframe.test.tsx`'s own React counterpart, and `render.ts`'s own
  // doc comment for why `allowFullScreen` (capital S) is the one prop name that works in both.
  assertStringIncludes(html, 'allowFullScreen>')
})

Deno.test('IFrame (preact): without allowFullscreen, no such attribute is rendered', () => {
  const html = render(IFrame({ src: 'https://example.com', title: 't' }))

  assertEquals(html.toLowerCase().includes('fullscreen'), false)
})

Deno.test('IFrame (preact): loading is forwarded verbatim', () => {
  const html = render(IFrame({ src: 'https://example.com', title: 't', loading: 'lazy' }))

  assertStringIncludes(html, 'loading="lazy"')
})

Deno.test('IFrame (preact): sandbox is forwarded verbatim', () => {
  const html = render(
    IFrame({
      src: 'https://example.com',
      title: 't',
      sandbox: 'allow-scripts allow-same-origin',
    }),
  )

  assertStringIncludes(html, 'sandbox="allow-scripts allow-same-origin"')
})

Deno.test('IFrame (preact): width and height accept numbers', () => {
  const html = render(
    IFrame({ src: 'https://example.com', title: 't', width: 640, height: 360 }),
  )

  assertStringIncludes(html, 'width="640"')
  assertStringIncludes(html, 'height="360"')
})

Deno.test('IFrame (preact): id and className are forwarded', () => {
  const html = render(
    IFrame({
      src: 'https://example.com',
      title: 't',
      id: 'main-embed',
      className: 'ui-iframe',
    }),
  )

  assertStringIncludes(html, 'id="main-embed"')
  assertStringIncludes(html, 'class="ui-iframe"')
})

Deno.test('IFrame (preact): children render as fallback content', () => {
  const html = render(
    IFrame({
      src: 'https://example.com',
      title: 't',
      children: 'Your browser does not support iframes.',
    }),
  )

  assertStringIncludes(html, '>Your browser does not support iframes.</iframe>')
})

Deno.test('IFrame (preact): onLoad is wired onto the element (native load event)', () => {
  const onLoad = () => {}
  const vnode = IFrame({ src: 'https://example.com', title: 't', onLoad })
  // `VNode<P = {}>`'s default `P` only knows about `children` — same structural limit as
  // `link-preact.test.tsx`'s own `onClick` cast, see that file's comment.
  const props = vnode.props as unknown as { onLoad: typeof onLoad }

  assertEquals(props.onLoad, onLoad)
})
