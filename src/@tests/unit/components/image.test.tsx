import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { Image } from 'components/Image/index.ts'

Deno.test('Image: renders a bare <img> with src and alt when sources is absent', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertStringIncludes(html, '<img')
  assertStringIncludes(html, 'alt="A photo"')
  assertEquals(html.includes('<picture'), false)
})

Deno.test('Image: an explicit empty sources array also renders a bare <img>', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' sources={[]} />)

  assertEquals(html.includes('<picture'), false)
  assertStringIncludes(html, '<img')
})

Deno.test('Image: sources renders a <picture> with one <source> per entry, img last', () => {
  const html = renderToStaticMarkup(
    <Image
      src='desktop.jpg'
      alt='A photo'
      sources={[
        { media: '(max-width: 599px)', src: 'mobile.jpg' },
        { media: '(min-width: 600px)', src: 'tablet.jpg' },
      ]}
    />,
  )

  assertStringIncludes(html, '<picture>')
  assertStringIncludes(html, '<source media="(max-width: 599px)" srcSet="/assets/mobile.jpg"/>')
  assertStringIncludes(html, '<source media="(min-width: 600px)" srcSet="/assets/tablet.jpg"/>')
  // fallback <img> is the last child of <picture>
  const pictureBody = html.slice(html.indexOf('<picture>'), html.indexOf('</picture>'))
  assertStringIncludes(pictureBody.slice(pictureBody.lastIndexOf('<source')), '<img')
})

Deno.test('Image: source type is rendered when provided, omitted when not', () => {
  const html = renderToStaticMarkup(
    <Image
      src='desktop.jpg'
      alt='A photo'
      sources={[
        { media: '(min-width: 600px)', src: 'tablet.avif', type: 'image/avif' },
        { media: '(max-width: 599px)', src: 'mobile.jpg' },
      ]}
    />,
  )

  assertStringIncludes(html, 'type="image/avif"')
  assertStringIncludes(html, '<source media="(max-width: 599px)" srcSet="/assets/mobile.jpg"/>')
})

Deno.test('Image: src resolves through resolveAssetHref when the manifest has an entry', () => {
  setAssetsManifestState({ manifest: { 'photo.jpg': '/assets/photo-abc123.jpg' } })
  try {
    const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)
    assertStringIncludes(html, 'src="/assets/photo-abc123.jpg"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Image: src falls back to /assets/<path> when unresolved', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertStringIncludes(html, 'src="/assets/photo.jpg"')
})

Deno.test('Image: sources[].src also resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'mobile.jpg': '/assets/mobile-abc123.jpg' } })
  try {
    const html = renderToStaticMarkup(
      <Image
        src='desktop.jpg'
        alt='A photo'
        sources={[{ media: '(max-width: 599px)', src: 'mobile.jpg' }]}
      />,
    )
    assertStringIncludes(html, 'srcSet="/assets/mobile-abc123.jpg"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Image: an absolute src URL passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Image src='https://cdn.example.com/photo.jpg' alt='A photo' />,
  )

  assertStringIncludes(html, 'src="https://cdn.example.com/photo.jpg"')
})

Deno.test('Image: an absolute sources[].src URL passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Image
      src='desktop.jpg'
      alt='A photo'
      sources={[{ media: '(max-width: 599px)', src: 'https://cdn.example.com/mobile.jpg' }]}
    />,
  )

  assertStringIncludes(html, 'srcSet="https://cdn.example.com/mobile.jpg"')
})

Deno.test('Image: alt="" is rendered explicitly, not omitted, for a decorative image', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='' />)

  assertStringIncludes(html, 'alt=""')
})

Deno.test('Image: decoding defaults to async', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertStringIncludes(html, 'decoding="async"')
})

Deno.test('Image: decoding accepts an explicit value', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' decoding='sync' />)

  assertStringIncludes(html, 'decoding="sync"')
})

Deno.test('Image: loading is forwarded verbatim', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' loading='lazy' />)

  assertStringIncludes(html, 'loading="lazy"')
})

Deno.test('Image: without loading, no attribute is rendered (native default applies)', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertEquals(html.includes('loading='), false)
})

Deno.test('Image: fetchPriority is forwarded verbatim', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' fetchPriority='high' />)

  // Empirically verified: React's renderToStaticMarkup serializes this attribute name/casing
  // identically to Preact's preact-render-to-string on the real <img> element — no remap needed,
  // see `render.ts`'s own doc. (React 19 additionally emits a sibling <link rel="preload"> hint
  // here — harmless, expected, not asserted against by this test.)
  assertStringIncludes(html, 'fetchPriority="high"')
})

Deno.test('Image: without fetchPriority, no attribute is rendered', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertEquals(html.includes('fetchPriority'), false)
})

Deno.test('Image: crossOrigin is forwarded verbatim', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' crossOrigin='anonymous' />)

  assertStringIncludes(html, 'crossorigin="anonymous"')
})

Deno.test('Image: without crossOrigin, no attribute is rendered', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertEquals(html.includes('crossorigin'), false)
})

Deno.test('Image: referrerPolicy is forwarded verbatim', () => {
  const html = renderToStaticMarkup(
    <Image src='photo.jpg' alt='A photo' referrerPolicy='no-referrer' />,
  )

  assertStringIncludes(html, 'referrerPolicy="no-referrer"')
})

Deno.test('Image: without referrerPolicy, no attribute is rendered', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertEquals(html.includes('referrerPolicy'), false)
})

Deno.test('Image: width and height accept numbers', () => {
  const html = renderToStaticMarkup(
    <Image src='photo.jpg' alt='A photo' width={800} height={600} />,
  )

  assertStringIncludes(html, 'width="800"')
  assertStringIncludes(html, 'height="600"')
})

Deno.test('Image: width and height accept strings', () => {
  const html = renderToStaticMarkup(
    <Image src='photo.jpg' alt='A photo' width='100%' height='auto' />,
  )

  assertStringIncludes(html, 'width="100%"')
  assertStringIncludes(html, 'height="auto"')
})

Deno.test('Image: without width/height, neither attribute is rendered', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertEquals(html.includes('width='), false)
  assertEquals(html.includes('height='), false)
})

// --- placeholder ---------------------------------------------------------------------------
//
// What's verified here, statically, from SSR output alone: the exact `background` inline-style
// string is present in the initial server-rendered markup (proving it needs no client JS/hydration
// to appear at all), that it resolves through the same asset mechanism as `src`, that it's absent
// entirely when the prop is absent, and that it composes with both the bare-<img> and <picture>
// branches identically. What's NOT verifiable from SSR string output — and would need a real
// browser (DevTools Network panel, or an equivalent headless-browser test) to confirm directly —
// is the actual runtime loading order: that the `background-image` request fires independently of
// `loading='lazy'` deferring the `src` request on the same element. That claim is grounded in the
// HTML Loading Attribute specification (`loading` governs only the element's own `src`/`srcset`
// request algorithm, with no defined effect on CSS-triggered resource fetches), not in a live
// browser trace run as part of this suite.

Deno.test('Image: placeholder renders as a background style on the bare <img>', () => {
  const html = renderToStaticMarkup(
    <Image src='photo.jpg' alt='A photo' placeholder='thumb.jpg' />,
  )

  assertStringIncludes(html, 'style="background:url(/assets/thumb.jpg) center / cover no-repeat"')
})

Deno.test('Image: without placeholder, no style attribute is rendered', () => {
  const html = renderToStaticMarkup(<Image src='photo.jpg' alt='A photo' />)

  assertEquals(html.includes('style='), false)
})

Deno.test('Image: placeholder resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'thumb.jpg': '/assets/thumb-abc123.jpg' } })
  try {
    const html = renderToStaticMarkup(
      <Image src='photo.jpg' alt='A photo' placeholder='thumb.jpg' />,
    )
    assertStringIncludes(html, 'background:url(/assets/thumb-abc123.jpg)')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Image: an absolute placeholder URL passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Image src='photo.jpg' alt='A photo' placeholder='https://cdn.example.com/thumb.jpg' />,
  )

  assertStringIncludes(html, 'background:url(https://cdn.example.com/thumb.jpg)')
})

Deno.test('Image: placeholder still renders on the <img> when sources is also given', () => {
  const html = renderToStaticMarkup(
    <Image
      src='desktop.jpg'
      alt='A photo'
      placeholder='thumb.jpg'
      sources={[{ media: '(max-width: 599px)', src: 'mobile.jpg' }]}
    />,
  )

  assertStringIncludes(html, '<picture>')
  assertStringIncludes(html, 'style="background:url(/assets/thumb.jpg) center / cover no-repeat"')
  // still absent from <picture> itself — same placement rule as id/className/data-space-ui.
  assertEquals(html.includes('<picture style='), false)
})

Deno.test('Image: id, className, and data-space-ui render on the bare <img>', () => {
  const html = renderToStaticMarkup(
    <Image src='photo.jpg' alt='A photo' id='hero' className='ui-image' />,
  )

  assertStringIncludes(html, '<img')
  assertStringIncludes(html, 'id="hero"')
  assertStringIncludes(html, 'class="ui-image"')
  assertStringIncludes(html, 'data-space-ui="image"')
})

Deno.test(
  'Image: id, className, and data-space-ui render on the <img> inside <picture>, never on <picture> itself',
  () => {
    const html = renderToStaticMarkup(
      <Image
        src='photo.jpg'
        alt='A photo'
        id='hero'
        className='ui-image'
        sources={[{ media: '(max-width: 599px)', src: 'mobile.jpg' }]}
      />,
    )

    // <picture> itself carries none of these — only its inner <img> does.
    assertStringIncludes(html, '<picture>')
    assertEquals(html.includes('<picture id='), false)
    assertEquals(html.includes('<picture class='), false)
    assertEquals(html.includes('<picture data-space-ui='), false)
    assertStringIncludes(html, 'id="hero"')
    assertStringIncludes(html, 'class="ui-image"')
    assertStringIncludes(html, 'data-space-ui="image"')
  },
)

Deno.test(
  'Image: onLoad/onError are wired onto the element (fire on native events, not serialized)',
  () => {
    // Same reasoning as `iframe.test.tsx`'s own `onLoad` test: `renderToStaticMarkup` never
    // serializes event handlers into the HTML string — the plumbing is verified directly on the
    // element's own props instead. Empirically confirmed this holds for React's `createElement`
    // the same way it already does for Preact's `h` — see `render.ts`'s own doc.
    const onLoad = () => {}
    const onError = () => {}
    const element = Image({ src: 'photo.jpg', alt: 'A photo', onLoad, onError })
    const props = element.props as { onLoad: typeof onLoad; onError: typeof onError }

    assertEquals(props.onLoad, onLoad)
    assertEquals(props.onError, onError)
  },
)

Deno.test('Image: a realistic multi-prop example renders well-formed markup', () => {
  const html = renderToStaticMarkup(
    <Image
      src='hero-desktop.jpg'
      alt='A mountain at sunrise'
      width={1200}
      height={630}
      loading='eager'
      fetchPriority='high'
      id='hero'
      className='ui-image'
      sources={[
        { media: '(max-width: 599px)', src: 'hero-mobile.jpg', type: 'image/jpeg' },
      ]}
    />,
  )

  assertStringIncludes(html, '<picture><source media="(max-width: 599px)"')
  assertStringIncludes(html, 'src="/assets/hero-desktop.jpg"')
  assertStringIncludes(html, 'alt="A mountain at sunrise"')
  assertStringIncludes(html, 'width="1200"')
  assertStringIncludes(html, 'height="630"')
  assertStringIncludes(html, 'fetchPriority="high"')
  assertStringIncludes(html, 'id="hero"')
  assertStringIncludes(html, 'class="ui-image"')
})
