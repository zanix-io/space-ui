import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Thumbnail } from 'components/Thumbnail/index.ts'

function galleryIcon() {
  return <svg data-testid='gallery-icon' />
}

function mount(element: ReturnType<typeof Thumbnail>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Thumbnail>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- no src — fallback ---------------------------------------------------------------------

Deno.test('Thumbnail: no src — renders the caller-supplied fallback, decorative by default', () => {
  const html = renderToStaticMarkup(
    <Thumbnail alt='' fallback={galleryIcon} />,
  )
  assertStringIncludes(html, 'data-space-ui="thumbnail"')
  assertStringIncludes(html, 'data-space-ui="thumbnail-fallback"')
  assertStringIncludes(html, 'data-testid="gallery-icon"')
  assertStringIncludes(html, 'aria-hidden="true"')
  assertEquals(html.includes('data-loaded'), false)
  assertEquals(html.includes('data-pending'), false)
})

Deno.test('Thumbnail: no src, non-empty alt — fallback gets role=img/aria-label instead', () => {
  const html = renderToStaticMarkup(
    <Thumbnail alt='Wireless headphones' fallback={galleryIcon} />,
  )
  assertStringIncludes(html, 'role="img"')
  assertStringIncludes(html, 'aria-label="Wireless headphones"')
})

// --- image branch, real DOM ------------------------------------------------------------------

Deno.test('Thumbnail: with src, renders a real Image with alt, no fallback shown', () => {
  const { container, unmount } = mount(
    <Thumbnail
      src='https://cdn.example.com/product.jpg'
      alt='Wireless headphones'
      fallback={galleryIcon}
    />,
  )
  const img = must(container.querySelector('img'))
  assertEquals(img.getAttribute('alt'), 'Wireless headphones')
  assertEquals(container.querySelector('[data-space-ui="thumbnail-fallback"]'), null)

  unmount()
})

Deno.test(
  'Thumbnail: while the image has not resolved yet, data-pending is set and Skeleton is composed',
  () => {
    const { container, unmount } = mount(
      <Thumbnail
        src='https://cdn.example.com/product.jpg'
        alt='Wireless headphones'
        fallback={galleryIcon}
      />,
    )
    const root = must(container.querySelector('[data-space-ui="thumbnail"]'))
    assertEquals(root.getAttribute('data-pending'), 'true')
    assertEquals(root.getAttribute('data-loaded'), null)
    assertEquals(container.querySelector('[data-space-ui="skeleton"]') !== null, true)

    unmount()
  },
)

Deno.test(
  'Thumbnail: a real load event sets data-loaded and removes the composed Skeleton',
  () => {
    const { container, unmount } = mount(
      <Thumbnail
        src='https://cdn.example.com/product.jpg'
        alt='Wireless headphones'
        fallback={galleryIcon}
      />,
    )
    const img = must(container.querySelector('img'))

    act(() => img.dispatchEvent(new Event('load')))

    const root = must(container.querySelector('[data-space-ui="thumbnail"]'))
    assertEquals(root.getAttribute('data-loaded'), 'true')
    assertEquals(root.getAttribute('data-pending'), null)
    assertEquals(container.querySelector('[data-space-ui="skeleton"]'), null)

    unmount()
  },
)

Deno.test('Thumbnail: a real error event swaps to the fallback, never alongside data-pending/data-loaded', () => {
  const { container, unmount } = mount(
    <Thumbnail
      src='https://cdn.example.com/broken.jpg'
      alt='Wireless headphones'
      fallback={galleryIcon}
    />,
  )
  const img = must(container.querySelector('img'))

  act(() => img.dispatchEvent(new Event('error')))

  assertEquals(container.querySelector('img'), null)
  assertEquals(container.querySelector('[data-space-ui="skeleton"]'), null)
  const root = must(container.querySelector('[data-space-ui="thumbnail"]'))
  assertEquals(root.getAttribute('data-loaded'), null)
  assertEquals(root.getAttribute('data-pending'), null)
  assertEquals(container.querySelector('[data-space-ui="thumbnail-fallback"]') !== null, true)

  unmount()
})

Deno.test(
  'Thumbnail: an image already broken before mount still swaps to the fallback (decode() rejects)',
  async () => {
    const proto = Object.getPrototypeOf(document.createElement('img'))
    const originalDecode = proto.decode
    proto.decode = () => Promise.reject(new Error('simulated already-broken decode'))

    try {
      const { container, unmount } = mount(
        <Thumbnail
          src='https://cdn.example.com/broken.jpg'
          alt='Wireless headphones'
          fallback={galleryIcon}
        />,
      )
      await act(async () => {
        await Promise.resolve()
      })

      assertEquals(container.querySelector('img'), null)
      assertEquals(container.querySelector('[data-space-ui="thumbnail-fallback"]') !== null, true)

      unmount()
    } finally {
      proto.decode = originalDecode
    }
  },
)

Deno.test('Thumbnail: onLoad/onError callbacks fire alongside the internal state', () => {
  let loadCalls = 0
  let errorCalls = 0
  const { container, unmount } = mount(
    <Thumbnail
      src='https://cdn.example.com/product.jpg'
      alt='Wireless headphones'
      fallback={galleryIcon}
      onLoad={() => loadCalls++}
      onError={() => errorCalls++}
    />,
  )
  const img = must(container.querySelector('img'))

  act(() => img.dispatchEvent(new Event('load')))
  assertEquals(loadCalls, 1)
  assertEquals(errorCalls, 0)

  unmount()
})

Deno.test('Thumbnail: crossOrigin forwards through unchanged to the rendered img', () => {
  const { container, unmount } = mount(
    <Thumbnail
      src='https://cdn.example.com/product.jpg'
      alt='Wireless headphones'
      fallback={galleryIcon}
      crossOrigin='anonymous'
    />,
  )
  const img = must(container.querySelector('img'))
  assertEquals(img.getAttribute('crossorigin'), 'anonymous')

  unmount()
})

Deno.test('Thumbnail: id/className land on the root element', () => {
  const html = renderToStaticMarkup(
    <Thumbnail alt='' fallback={galleryIcon} id='product-thumb' className='big' />,
  )
  assertStringIncludes(html, 'id="product-thumb"')
  assertStringIncludes(html, 'class="big"')
})
