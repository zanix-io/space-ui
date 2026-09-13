import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Avatar } from 'components/Avatar/index.ts'

function mount(element: ReturnType<typeof Avatar>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Avatar>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- initials fallback (no src) ----------------------------------------------------------------

Deno.test('Avatar: no src — renders initials derived from a two-word name', () => {
  const html = renderToStaticMarkup(<Avatar name='Ada Lovelace' />)
  assertStringIncludes(html, 'data-space-ui="avatar"')
  assertStringIncludes(html, 'data-shape="circle"')
  assertStringIncludes(html, 'AL')
  assertStringIncludes(html, 'role="img"')
  assertStringIncludes(html, 'aria-label="Ada Lovelace"')
})

Deno.test('Avatar: single-word name uses its own first two characters', () => {
  const html = renderToStaticMarkup(<Avatar name='Prince' />)
  assertStringIncludes(html, 'PR')
})

Deno.test('Avatar: shape="square" reflects as data-shape', () => {
  const html = renderToStaticMarkup(<Avatar name='Ada Lovelace' shape='square' />)
  assertStringIncludes(html, 'data-shape="square"')
})

// --- sizing ------------------------------------------------------------------------------------

Deno.test('Avatar: named size tokens resolve to real pixel width/height', () => {
  const html = renderToStaticMarkup(<Avatar name='Ada Lovelace' size='lg' />)
  assertStringIncludes(html, 'width:64px')
  assertStringIncludes(html, 'height:64px')
})

Deno.test('Avatar: an explicit numeric size is used verbatim', () => {
  const html = renderToStaticMarkup(<Avatar name='Ada Lovelace' size={100} />)
  assertStringIncludes(html, 'width:100px')
})

Deno.test('Avatar: default size is md (48px)', () => {
  const html = renderToStaticMarkup(<Avatar name='Ada Lovelace' />)
  assertStringIncludes(html, 'width:48px')
})

// --- `data-avatar-id` stability (deriveStableCometId, not the renderer's own useId()) -----------

Deno.test(
  'Avatar: data-avatar-id is identical across two independent renders of the same props — proves ' +
    "it's derived from props, never render order/a hydration-root-scoped counter",
  () => {
    const first = renderToStaticMarkup(<Avatar name='Ada Lovelace' size='lg' />)
    const second = renderToStaticMarkup(<Avatar name='Ada Lovelace' size='lg' />)
    const idOf = (html: string) => must(html.match(/data-avatar-id="([^"]+)"/))[1]
    assertEquals(idOf(first), idOf(second))
  },
)

Deno.test(
  'Avatar: two instances sharing name but a different size never collide on data-avatar-id — the ' +
    'one case that would otherwise scope the wrong sizeCss to the wrong instance',
  () => {
    const small = renderToStaticMarkup(<Avatar name='Ada Lovelace' size='sm' />)
    const large = renderToStaticMarkup(<Avatar name='Ada Lovelace' size='lg' />)
    const idOf = (html: string) => must(html.match(/data-avatar-id="([^"]+)"/))[1]
    assertEquals(idOf(small) === idOf(large), false)
  },
)

// --- image branch + onError fallback (real DOM) -----------------------------------------------

Deno.test('Avatar: with src, renders a real Image with alt=name, no initials shown', () => {
  const { container, unmount } = mount(
    <Avatar name='Ada Lovelace' src='https://cdn.example.com/ada.jpg' />,
  )
  const img = must(container.querySelector('img'))
  assertEquals(img.getAttribute('alt'), 'Ada Lovelace')
  assertEquals(container.querySelector('[data-space-ui="avatar-initials"]'), null)

  unmount()
})

Deno.test('Avatar: image load failure swaps to the initials fallback', () => {
  const { container, unmount } = mount(
    <Avatar name='Ada Lovelace' src='https://cdn.example.com/broken.jpg' />,
  )
  const img = must(container.querySelector('img'))

  act(() => img.dispatchEvent(new Event('error')))

  assertEquals(container.querySelector('img'), null)
  const fallback = must(container.querySelector('[data-space-ui="avatar-initials"]'))
  assertEquals(fallback.textContent, 'AL')

  unmount()
})

Deno.test('Avatar: an image already broken before mount still swaps to initials (decode() rejects)', async () => {
  // `happy-dom`'s own `decode()` is a permanently-resolving stub (see `render.ts`'s own "An image
  // already broken before hydration" doc) — real per-environment behavior, not something this
  // package's test suite can rely on to exercise the rejection path. Overriding the prototype
  // directly is what lets this test simulate what a real browser reports for an image that was
  // already broken before this component's own effect ever ran.
  const proto = Object.getPrototypeOf(document.createElement('img'))
  const originalDecode = proto.decode
  proto.decode = () => Promise.reject(new Error('simulated already-broken decode'))

  try {
    const { container, unmount } = mount(
      <Avatar name='Ada Lovelace' src='https://cdn.example.com/broken.jpg' />,
    )
    // Flushes the effect's `decode().catch()` microtask and the state update it schedules —
    // neither has settled yet at this point, since `mount`'s own `act()` call is synchronous.
    await act(async () => {
      await Promise.resolve()
    })

    assertEquals(container.querySelector('img'), null)
    const fallback = must(container.querySelector('[data-space-ui="avatar-initials"]'))
    assertEquals(fallback.textContent, 'AL')

    unmount()
  } finally {
    proto.decode = originalDecode
  }
})

Deno.test("Avatar: an environment without decode() support doesn't throw and keeps onError working", async () => {
  const proto = Object.getPrototypeOf(document.createElement('img'))
  const originalDecode = proto.decode
  // deno-lint-ignore no-explicit-any
  delete (proto as any).decode

  try {
    const { container, unmount } = mount(
      <Avatar name='Ada Lovelace' src='https://cdn.example.com/broken.jpg' />,
    )
    await act(async () => {
      await Promise.resolve()
    })
    // No `decode` to reject — the image is still showing, exactly today's pre-fix behavior, until
    // a real `error` event exercises the untouched `onError` path.
    const img = must(container.querySelector('img'))

    act(() => img.dispatchEvent(new Event('error')))
    assertEquals(container.querySelector('img'), null)
    assertEquals(
      must(container.querySelector('[data-space-ui="avatar-initials"]')).textContent,
      'AL',
    )

    unmount()
  } finally {
    proto.decode = originalDecode
  }
})

Deno.test('Avatar: swapping to a new, different src resets a prior failure', () => {
  const { container, rerender, unmount } = mount(
    <Avatar name='Ada Lovelace' src='https://cdn.example.com/broken.jpg' />,
  )
  const img = must(container.querySelector('img'))
  act(() => img.dispatchEvent(new Event('error')))
  assertEquals(container.querySelector('img'), null)

  rerender(<Avatar name='Ada Lovelace' src='https://cdn.example.com/working.jpg' />)
  assertEquals(container.querySelector('img') !== null, true)

  unmount()
})

Deno.test('Avatar: id/className land on the root element', () => {
  const html = renderToStaticMarkup(<Avatar name='Ada Lovelace' id='user-avatar' className='big' />)
  assertStringIncludes(html, 'id="user-avatar"')
  assertStringIncludes(html, 'class="big"')
})

Deno.test('Avatar: nonce lands on the self-rendered sizing <style> element', () => {
  const html = renderToStaticMarkup(<Avatar name='Ada Lovelace' nonce='abc123' />)

  assertStringIncludes(html, '<style nonce="abc123">')
  assertEquals(html.includes(' style='), false)
})

Deno.test(
  'Avatar: crossOrigin forwards through unchanged to the rendered img — real fix for a ' +
    "confirmed session-cookie hazard (see AvatarBaseProps.crossOrigin's own doc)",
  () => {
    const { container, unmount } = mount(
      <Avatar name='Ada Lovelace' src='https://cdn.example.com/ada.jpg' crossOrigin='anonymous' />,
    )
    const img = must(container.querySelector('img'))
    assertEquals(img.getAttribute('crossorigin'), 'anonymous')

    unmount()
  },
)

Deno.test('Avatar: crossOrigin is omitted by default — never forced on a caller who never asked', () => {
  const { container, unmount } = mount(
    <Avatar name='Ada Lovelace' src='https://cdn.example.com/ada.jpg' />,
  )
  const img = must(container.querySelector('img'))
  assertEquals(img.getAttribute('crossorigin'), null)

  unmount()
})

// --- data-loaded / data-pending (shared/use-image-load-state.ts) -------------------------------

Deno.test('Avatar: no src — neither data-loaded nor data-pending is set', () => {
  const html = renderToStaticMarkup(<Avatar name='Ada Lovelace' />)
  assertEquals(html.includes('data-loaded'), false)
  assertEquals(html.includes('data-pending'), false)
})

Deno.test('Avatar: with src, before it resolves — data-pending is set, not data-loaded', () => {
  const { container, unmount } = mount(
    <Avatar name='Ada Lovelace' src='https://cdn.example.com/ada.jpg' />,
  )
  const root = must(container.querySelector('[data-space-ui="avatar"]'))
  assertEquals(root.getAttribute('data-pending'), 'true')
  assertEquals(root.getAttribute('data-loaded'), null)

  unmount()
})

Deno.test('Avatar: a real load event sets data-loaded, clears data-pending', () => {
  const { container, unmount } = mount(
    <Avatar name='Ada Lovelace' src='https://cdn.example.com/ada.jpg' />,
  )
  const img = must(container.querySelector('img'))

  act(() => img.dispatchEvent(new Event('load')))

  const root = must(container.querySelector('[data-space-ui="avatar"]'))
  assertEquals(root.getAttribute('data-loaded'), 'true')
  assertEquals(root.getAttribute('data-pending'), null)

  unmount()
})

Deno.test(
  'Avatar: a real error event shows the initials fallback with neither data-loaded nor data-pending',
  () => {
    const { container, unmount } = mount(
      <Avatar name='Ada Lovelace' src='https://cdn.example.com/broken.jpg' />,
    )
    const img = must(container.querySelector('img'))

    act(() => img.dispatchEvent(new Event('error')))

    const root = must(container.querySelector('[data-space-ui="avatar"]'))
    assertEquals(root.getAttribute('data-loaded'), null)
    assertEquals(root.getAttribute('data-pending'), null)

    unmount()
  },
)
