import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Thumbnail } from 'components/Thumbnail/index.preact.ts'
import type { ThumbnailProps } from 'components/Thumbnail/index.preact.ts'

function galleryIcon(): VNode {
  return h('svg', { 'data-testid': 'gallery-icon' }) as VNode
}

function element(props: ThumbnailProps): VNode {
  return h(Thumbnail, props) as VNode
}

function mount(props: ThumbnailProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: ThumbnailProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('Thumbnail (preact): no src — renders the caller-supplied fallback, decorative by default', () => {
  const html = renderToString(element({ alt: '', fallback: galleryIcon }))
  assertStringIncludes(html, 'data-space-ui="thumbnail"')
  assertStringIncludes(html, 'data-space-ui="thumbnail-fallback"')
  assertStringIncludes(html, 'data-testid="gallery-icon"')
  assertStringIncludes(html, 'aria-hidden="true"')
})

Deno.test('Thumbnail (preact): no src, non-empty alt — fallback gets role=img/aria-label', () => {
  const html = renderToString(
    element({ alt: 'Wireless headphones', fallback: galleryIcon }),
  )
  assertStringIncludes(html, 'role="img"')
  assertStringIncludes(html, 'aria-label="Wireless headphones"')
})

Deno.test('Thumbnail (preact): with src, renders a real img with alt, no fallback shown', () => {
  const { container, unmount } = mount({
    src: 'https://cdn.example.com/product.jpg',
    alt: 'Wireless headphones',
    fallback: galleryIcon,
  })
  const img = must(container.querySelector('img'))
  assertEquals(img.getAttribute('alt'), 'Wireless headphones')
  assertEquals(container.querySelector('[data-space-ui="thumbnail-fallback"]'), null)

  unmount()
})

Deno.test(
  'Thumbnail (preact): while pending, data-pending is set and Skeleton is composed',
  () => {
    const { container, unmount } = mount({
      src: 'https://cdn.example.com/product.jpg',
      alt: 'Wireless headphones',
      fallback: galleryIcon,
    })
    const root = must(container.querySelector('[data-space-ui="thumbnail"]'))
    assertEquals(root.getAttribute('data-pending'), 'true')
    assertEquals(root.getAttribute('data-loaded'), null)
    assertEquals(container.querySelector('[data-space-ui="skeleton"]') !== null, true)

    unmount()
  },
)

Deno.test(
  'Thumbnail (preact): a real load event sets data-loaded and removes the composed Skeleton',
  () => {
    const { container, unmount } = mount({
      src: 'https://cdn.example.com/product.jpg',
      alt: 'Wireless headphones',
      fallback: galleryIcon,
    })
    const img = must(container.querySelector('img'))

    act(() => {
      img.dispatchEvent(new Event('load'))
    })

    const root = must(container.querySelector('[data-space-ui="thumbnail"]'))
    assertEquals(root.getAttribute('data-loaded'), 'true')
    assertEquals(root.getAttribute('data-pending'), null)
    assertEquals(container.querySelector('[data-space-ui="skeleton"]'), null)

    unmount()
  },
)

Deno.test(
  'Thumbnail (preact): a real error event swaps to the fallback, never alongside data-pending/data-loaded',
  () => {
    const { container, unmount } = mount({
      src: 'https://cdn.example.com/broken.jpg',
      alt: 'Wireless headphones',
      fallback: galleryIcon,
    })
    const img = must(container.querySelector('img'))

    act(() => {
      img.dispatchEvent(new Event('error'))
    })

    assertEquals(container.querySelector('img'), null)
    assertEquals(container.querySelector('[data-space-ui="skeleton"]'), null)
    const root = must(container.querySelector('[data-space-ui="thumbnail"]'))
    assertEquals(root.getAttribute('data-loaded'), null)
    assertEquals(root.getAttribute('data-pending'), null)
    assertEquals(container.querySelector('[data-space-ui="thumbnail-fallback"]') !== null, true)

    unmount()
  },
)

Deno.test(
  'Thumbnail (preact): an image already broken before mount still swaps to the fallback (decode() rejects)',
  async () => {
    const proto = Object.getPrototypeOf(document.createElement('img'))
    const originalDecode = proto.decode
    proto.decode = () => Promise.reject(new Error('simulated already-broken decode'))

    try {
      const { container, unmount } = mount({
        src: 'https://cdn.example.com/broken.jpg',
        alt: 'Wireless headphones',
        fallback: galleryIcon,
      })
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

Deno.test('Thumbnail (preact): onLoad/onError callbacks fire alongside the internal state', () => {
  let loadCalls = 0
  const { container, unmount } = mount({
    src: 'https://cdn.example.com/product.jpg',
    alt: 'Wireless headphones',
    fallback: galleryIcon,
    onLoad: () => loadCalls++,
  })
  const img = must(container.querySelector('img'))

  act(() => {
    img.dispatchEvent(new Event('load'))
  })
  assertEquals(loadCalls, 1)

  unmount()
})

Deno.test('Thumbnail (preact): crossOrigin forwards through unchanged to the rendered img', () => {
  const { container, unmount } = mount({
    src: 'https://cdn.example.com/product.jpg',
    alt: 'Wireless headphones',
    fallback: galleryIcon,
    crossOrigin: 'anonymous',
  })
  const img = must(container.querySelector('img'))
  assertEquals(img.getAttribute('crossorigin'), 'anonymous')

  unmount()
})
