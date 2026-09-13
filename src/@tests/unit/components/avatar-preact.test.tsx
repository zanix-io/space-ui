import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Avatar } from 'components/Avatar/index.preact.ts'
import type { AvatarProps } from 'components/Avatar/index.preact.ts'

function element(props: AvatarProps): VNode {
  return h(Avatar, props) as VNode
}

function mount(props: AvatarProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: AvatarProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('Avatar (preact): no src — renders initials, role=img, aria-label=name', () => {
  const html = renderToString(element({ name: 'Ada Lovelace' }))
  assertStringIncludes(html, 'data-space-ui="avatar"')
  assertStringIncludes(html, 'AL')
  assertStringIncludes(html, 'role="img"')
  assertStringIncludes(html, 'aria-label="Ada Lovelace"')
})

Deno.test('Avatar (preact): named size token resolves to real pixels', () => {
  const html = renderToString(element({ name: 'Ada Lovelace', size: 'sm' }))
  assertStringIncludes(html, 'width:32px')
})

// --- `data-avatar-id` stability (deriveStableCometId, not the renderer's own useId()) -----------

Deno.test(
  'Avatar (preact): data-avatar-id is identical across two independent renders of the same props',
  () => {
    const first = renderToString(element({ name: 'Ada Lovelace', size: 'lg' }))
    const second = renderToString(element({ name: 'Ada Lovelace', size: 'lg' }))
    const idOf = (html: string) => must(html.match(/data-avatar-id="([^"]+)"/))[1]
    assertEquals(idOf(first), idOf(second))
  },
)

Deno.test(
  'Avatar (preact): two instances sharing name but a different size never collide on data-avatar-id',
  () => {
    const small = renderToString(element({ name: 'Ada Lovelace', size: 'sm' }))
    const large = renderToString(element({ name: 'Ada Lovelace', size: 'lg' }))
    const idOf = (html: string) => must(html.match(/data-avatar-id="([^"]+)"/))[1]
    assertEquals(idOf(small) === idOf(large), false)
  },
)

Deno.test('Avatar (preact): with src, renders a real img with alt=name', () => {
  const { container, unmount } = mount({
    name: 'Ada Lovelace',
    src: 'https://cdn.example.com/ada.jpg',
  })
  const img = must(container.querySelector('img'))
  assertEquals(img.getAttribute('alt'), 'Ada Lovelace')

  unmount()
})

Deno.test('Avatar (preact): image load failure swaps to the initials fallback', () => {
  const { container, unmount } = mount({
    name: 'Ada Lovelace',
    src: 'https://cdn.example.com/broken.jpg',
  })
  const img = must(container.querySelector('img'))

  act(() => {
    img.dispatchEvent(new Event('error'))
  })

  assertEquals(container.querySelector('img'), null)
  assertEquals(container.querySelector('[data-space-ui="avatar-initials"]')?.textContent, 'AL')

  unmount()
})

Deno.test('Avatar (preact): an image already broken before mount still swaps to initials (decode() rejects)', async () => {
  // `happy-dom`'s own `decode()` is a permanently-resolving stub (see `render.ts`'s own "An image
  // already broken before hydration" doc) — real per-environment behavior, not something this
  // package's test suite can rely on to exercise the rejection path. Overriding the prototype
  // directly is what lets this test simulate what a real browser reports for an image that was
  // already broken before this component's own effect ever ran.
  const proto = Object.getPrototypeOf(document.createElement('img'))
  const originalDecode = proto.decode
  proto.decode = () => Promise.reject(new Error('simulated already-broken decode'))

  try {
    const { container, unmount } = mount({
      name: 'Ada Lovelace',
      src: 'https://cdn.example.com/broken.jpg',
    })
    // Flushes the effect's `decode().catch()` microtask and the state update it schedules —
    // neither has settled yet at this point, since `mount`'s own `act()` call is synchronous.
    await act(async () => {
      await Promise.resolve()
    })

    assertEquals(container.querySelector('img'), null)
    assertEquals(container.querySelector('[data-space-ui="avatar-initials"]')?.textContent, 'AL')

    unmount()
  } finally {
    proto.decode = originalDecode
  }
})

Deno.test('Avatar (preact): nonce lands on the self-rendered sizing <style> element', () => {
  const html = renderToString(element({ name: 'Ada Lovelace', nonce: 'abc123' }))

  assertStringIncludes(html, '<style nonce="abc123">')
  assertEquals(html.includes(' style='), false)
})

Deno.test(
  'Avatar (preact): crossOrigin forwards through unchanged to the rendered img — real fix for a ' +
    "confirmed session-cookie hazard (see AvatarBaseProps.crossOrigin's own doc)",
  () => {
    const { container, unmount } = mount({
      name: 'Ada Lovelace',
      src: 'https://cdn.example.com/ada.jpg',
      crossOrigin: 'anonymous',
    })
    const img = must(container.querySelector('img'))
    assertEquals(img.getAttribute('crossorigin'), 'anonymous')

    unmount()
  },
)

Deno.test(
  'Avatar (preact): crossOrigin is omitted by default — never forced on a caller who never asked',
  () => {
    const { container, unmount } = mount({
      name: 'Ada Lovelace',
      src: 'https://cdn.example.com/ada.jpg',
    })
    const img = must(container.querySelector('img'))
    assertEquals(img.getAttribute('crossorigin'), null)

    unmount()
  },
)

// --- data-loaded / data-pending (shared/use-image-load-state.preact.ts) ------------------------

Deno.test('Avatar (preact): no src — neither data-loaded nor data-pending is set', () => {
  const html = renderToString(element({ name: 'Ada Lovelace' }))
  assertEquals(html.includes('data-loaded'), false)
  assertEquals(html.includes('data-pending'), false)
})

Deno.test('Avatar (preact): with src, before it resolves — data-pending is set, not data-loaded', () => {
  const { container, unmount } = mount({
    name: 'Ada Lovelace',
    src: 'https://cdn.example.com/ada.jpg',
  })
  const root = must(container.querySelector('[data-space-ui="avatar"]'))
  assertEquals(root.getAttribute('data-pending'), 'true')
  assertEquals(root.getAttribute('data-loaded'), null)

  unmount()
})

Deno.test('Avatar (preact): a real load event sets data-loaded, clears data-pending', () => {
  const { container, unmount } = mount({
    name: 'Ada Lovelace',
    src: 'https://cdn.example.com/ada.jpg',
  })
  const img = must(container.querySelector('img'))

  act(() => {
    img.dispatchEvent(new Event('load'))
  })

  const root = must(container.querySelector('[data-space-ui="avatar"]'))
  assertEquals(root.getAttribute('data-loaded'), 'true')
  assertEquals(root.getAttribute('data-pending'), null)

  unmount()
})

Deno.test(
  'Avatar (preact): a real error event shows initials with neither data-loaded nor data-pending',
  () => {
    const { container, unmount } = mount({
      name: 'Ada Lovelace',
      src: 'https://cdn.example.com/broken.jpg',
    })
    const img = must(container.querySelector('img'))

    act(() => {
      img.dispatchEvent(new Event('error'))
    })

    const root = must(container.querySelector('[data-space-ui="avatar"]'))
    assertEquals(root.getAttribute('data-loaded'), null)
    assertEquals(root.getAttribute('data-pending'), null)

    unmount()
  },
)
