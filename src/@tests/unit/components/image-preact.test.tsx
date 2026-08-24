import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { Image } from 'components/Image/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why. `Image`
// never returns `null` (unlike `Video`), so no `assert(vnode)` narrowing is needed here.

Deno.test('Image (preact): renders a bare <img> with src and alt when sources is absent', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertStringIncludes(html, '<img')
  assertStringIncludes(html, 'alt="A photo"')
  assertEquals(html.includes('<picture'), false)
})

Deno.test('Image (preact): an explicit empty sources array also renders a bare <img>', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', sources: [] }))

  assertEquals(html.includes('<picture'), false)
  assertStringIncludes(html, '<img')
})

Deno.test(
  'Image (preact): sources renders a <picture> with one <source> per entry, img last',
  () => {
    const html = render(
      Image({
        src: 'desktop.jpg',
        alt: 'A photo',
        sources: [
          { media: '(max-width: 599px)', src: 'mobile.jpg' },
          { media: '(min-width: 600px)', src: 'tablet.jpg' },
        ],
      }),
    )

    assertStringIncludes(html, '<picture>')
    // preact-render-to-string self-closes void elements (`<source .../>`, unlike React's
    // `renderToStaticMarkup`, which also self-closes but was already covered by the React test's
    // own assertion style) — asserted here, not assumed.
    assertStringIncludes(html, '<source media="(max-width: 599px)" srcset="/assets/mobile.jpg"/>')
    assertStringIncludes(html, '<source media="(min-width: 600px)" srcset="/assets/tablet.jpg"/>')
    const pictureBody = html.slice(html.indexOf('<picture>'), html.indexOf('</picture>'))
    assertStringIncludes(pictureBody.slice(pictureBody.lastIndexOf('<source')), '<img')
  },
)

Deno.test('Image (preact): source type is rendered when provided, omitted when not', () => {
  const html = render(
    Image({
      src: 'desktop.jpg',
      alt: 'A photo',
      sources: [
        { media: '(min-width: 600px)', src: 'tablet.avif', type: 'image/avif' },
        { media: '(max-width: 599px)', src: 'mobile.jpg' },
      ],
    }),
  )

  assertStringIncludes(html, 'type="image/avif"')
  assertStringIncludes(html, '<source media="(max-width: 599px)" srcset="/assets/mobile.jpg"/>')
})

Deno.test(
  'Image (preact): src resolves through resolveAssetHref when the manifest has an entry',
  () => {
    setAssetsManifestState({ manifest: { 'photo.jpg': '/assets/photo-abc123.jpg' } })
    try {
      const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))
      assertStringIncludes(html, 'src="/assets/photo-abc123.jpg"')
    } finally {
      setAssetsManifestState(undefined)
    }
  },
)

Deno.test('Image (preact): src falls back to /assets/<path> when unresolved', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertStringIncludes(html, 'src="/assets/photo.jpg"')
})

Deno.test('Image (preact): sources[].src also resolves through resolveAssetHref', () => {
  setAssetsManifestState({ manifest: { 'mobile.jpg': '/assets/mobile-abc123.jpg' } })
  try {
    const html = render(
      Image({
        src: 'desktop.jpg',
        alt: 'A photo',
        sources: [{ media: '(max-width: 599px)', src: 'mobile.jpg' }],
      }),
    )
    assertStringIncludes(html, 'srcset="/assets/mobile-abc123.jpg"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Image (preact): an absolute src URL passes through untouched', () => {
  const html = render(Image({ src: 'https://cdn.example.com/photo.jpg', alt: 'A photo' }))

  assertStringIncludes(html, 'src="https://cdn.example.com/photo.jpg"')
})

Deno.test('Image (preact): an absolute sources[].src URL passes through untouched', () => {
  const html = render(
    Image({
      src: 'desktop.jpg',
      alt: 'A photo',
      sources: [{ media: '(max-width: 599px)', src: 'https://cdn.example.com/mobile.jpg' }],
    }),
  )

  assertStringIncludes(html, 'srcset="https://cdn.example.com/mobile.jpg"')
})

Deno.test('Image (preact): alt="" is rendered as a present (not omitted) attribute', () => {
  const html = render(Image({ src: 'photo.jpg', alt: '' }))

  // Empirically confirmed: unlike React's `renderToStaticMarkup` (which serializes `alt=""`
  // explicitly, see `image.test.tsx`'s own counterpart), `preact-render-to-string` serializes an
  // empty-string attribute value as a bare attribute with no `=""` at all — `<img ... alt ...>`,
  // not `<img ... alt="" ...>`. Both parse identically in a real browser (an attribute with no
  // `=value` gets the empty string as its value per the HTML spec), so this is a pure SSR-string
  // representation difference, not a behavior difference — asserted here so it's never assumed.
  assertEquals(html.includes('alt='), false)
  assertStringIncludes(html, ' alt ')
})

Deno.test('Image (preact): decoding defaults to async', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertStringIncludes(html, 'decoding="async"')
})

Deno.test('Image (preact): decoding accepts an explicit value', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', decoding: 'sync' }))

  assertStringIncludes(html, 'decoding="sync"')
})

Deno.test('Image (preact): loading is forwarded verbatim', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', loading: 'lazy' }))

  assertStringIncludes(html, 'loading="lazy"')
})

Deno.test('Image (preact): without loading, no attribute is rendered', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertEquals(html.includes('loading='), false)
})

Deno.test('Image (preact): fetchPriority is forwarded verbatim', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', fetchPriority: 'high' }))

  // Empirically verified identical casing to React's output on the real <img> element — no remap
  // needed, see `render.ts`'s own doc. Unlike React, Preact emits no extra <link rel="preload">.
  assertStringIncludes(html, 'fetchPriority="high"')
})

Deno.test('Image (preact): without fetchPriority, no attribute is rendered', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertEquals(html.includes('fetchPriority'), false)
})

Deno.test('Image (preact): crossOrigin is forwarded verbatim', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', crossOrigin: 'anonymous' }))

  assertStringIncludes(html, 'crossorigin="anonymous"')
})

Deno.test('Image (preact): without crossOrigin, no attribute is rendered', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertEquals(html.includes('crossorigin'), false)
})

Deno.test('Image (preact): referrerPolicy is forwarded verbatim', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', referrerPolicy: 'no-referrer' }))

  assertStringIncludes(html, 'referrerPolicy="no-referrer"')
})

Deno.test('Image (preact): without referrerPolicy, no attribute is rendered', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertEquals(html.includes('referrerPolicy'), false)
})

Deno.test('Image (preact): width and height accept numbers', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', width: 800, height: 600 }))

  assertStringIncludes(html, 'width="800"')
  assertStringIncludes(html, 'height="600"')
})

Deno.test('Image (preact): width and height accept strings', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', width: '100%', height: 'auto' }))

  assertStringIncludes(html, 'width="100%"')
  assertStringIncludes(html, 'height="auto"')
})

Deno.test('Image (preact): without width/height, neither attribute is rendered', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertEquals(html.includes('width='), false)
  assertEquals(html.includes('height='), false)
})

// --- placeholder ---------------------------------------------------------------------------
// See `image.test.tsx`'s own comment on this same boundary: statically verifiable from SSR output
// (presence/resolution/absence of the `background` style, composition with `sources`) vs. what
// needs a real browser to confirm (that the background-image request isn't deferred by
// `loading='lazy'` on the same element — grounded here in spec text, not a live browser trace).

Deno.test('Image (preact): placeholder renders as a background style on the bare <img>', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo', placeholder: 'thumb.jpg' }))

  assertStringIncludes(
    html,
    'style="background:url(/assets/thumb.jpg) center / cover no-repeat;"',
  )
})

Deno.test('Image (preact): without placeholder, no style attribute is rendered', () => {
  const html = render(Image({ src: 'photo.jpg', alt: 'A photo' }))

  assertEquals(html.includes('style='), false)
})

Deno.test(
  'Image (preact): placeholder resolves through resolveAssetHref when the manifest has an entry',
  () => {
    setAssetsManifestState({ manifest: { 'thumb.jpg': '/assets/thumb-abc123.jpg' } })
    try {
      const html = render(Image({ src: 'photo.jpg', alt: 'A photo', placeholder: 'thumb.jpg' }))
      assertStringIncludes(html, 'background:url(/assets/thumb-abc123.jpg)')
    } finally {
      setAssetsManifestState(undefined)
    }
  },
)

Deno.test('Image (preact): an absolute placeholder URL passes through untouched', () => {
  const html = render(
    Image({ src: 'photo.jpg', alt: 'A photo', placeholder: 'https://cdn.example.com/thumb.jpg' }),
  )

  assertStringIncludes(html, 'background:url(https://cdn.example.com/thumb.jpg)')
})

Deno.test('Image (preact): placeholder renders on the <img> when sources is also given', () => {
  const html = render(
    Image({
      src: 'desktop.jpg',
      alt: 'A photo',
      placeholder: 'thumb.jpg',
      sources: [{ media: '(max-width: 599px)', src: 'mobile.jpg' }],
    }),
  )

  assertStringIncludes(html, '<picture>')
  assertStringIncludes(
    html,
    'style="background:url(/assets/thumb.jpg) center / cover no-repeat;"',
  )
  assertEquals(html.includes('<picture style='), false)
})

Deno.test('Image (preact): id, className, and data-space-ui render on the bare <img>', () => {
  const html = render(
    Image({ src: 'photo.jpg', alt: 'A photo', id: 'hero', className: 'ui-image' }),
  )

  assertStringIncludes(html, '<img')
  assertStringIncludes(html, 'id="hero"')
  assertStringIncludes(html, 'class="ui-image"')
  assertStringIncludes(html, 'data-space-ui="image"')
})

Deno.test(
  'Image (preact): id, className, and data-space-ui render on the <img> inside <picture>, never on <picture> itself',
  () => {
    const html = render(
      Image({
        src: 'photo.jpg',
        alt: 'A photo',
        id: 'hero',
        className: 'ui-image',
        sources: [{ media: '(max-width: 599px)', src: 'mobile.jpg' }],
      }),
    )

    assertStringIncludes(html, '<picture>')
    assertEquals(html.includes('<picture id='), false)
    assertEquals(html.includes('<picture class='), false)
    assertEquals(html.includes('<picture data-space-ui='), false)
    assertStringIncludes(html, 'id="hero"')
    assertStringIncludes(html, 'class="ui-image"')
    assertStringIncludes(html, 'data-space-ui="image"')
  },
)

Deno.test('Image (preact): onLoad/onError are wired onto the element (native events)', () => {
  const onLoad = () => {}
  const onError = () => {}
  const vnode = Image({ src: 'photo.jpg', alt: 'A photo', onLoad, onError })
  // `VNode<P = {}>`'s default `P` only knows about `children` — same structural limit as
  // `iframe-preact.test.tsx`'s own `onLoad` cast, see that file's comment.
  const props = vnode.props as unknown as { onLoad: typeof onLoad; onError: typeof onError }

  assertEquals(props.onLoad, onLoad)
  assertEquals(props.onError, onError)
})

Deno.test('Image (preact): a realistic multi-prop example renders well-formed markup', () => {
  const html = render(
    Image({
      src: 'hero-desktop.jpg',
      alt: 'A mountain at sunrise',
      width: 1200,
      height: 630,
      loading: 'eager',
      fetchPriority: 'high',
      id: 'hero',
      className: 'ui-image',
      sources: [{ media: '(max-width: 599px)', src: 'hero-mobile.jpg', type: 'image/jpeg' }],
    }),
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
