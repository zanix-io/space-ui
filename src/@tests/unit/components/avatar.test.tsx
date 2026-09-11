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
