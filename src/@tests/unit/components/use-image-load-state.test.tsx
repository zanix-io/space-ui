import { must } from './dom-test-setup.ts'
import { act, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { useImageLoadState } from 'shared/use-image-load-state.ts'
import type { ImageLoadState } from 'shared/use-image-load-state.ts'

function Harness(
  { src, onState }: { src: string | undefined; onState: (state: ImageLoadState) => void },
) {
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const state = useImageLoadState(src, rootRef)
  onState(state)

  return (
    <span ref={rootRef}>
      {src ? <img src={src} onLoad={state.onLoad} onError={state.onError} /> : null}
    </span>
  )
}

function mount(src: string | undefined, onState: (state: ImageLoadState) => void) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Harness src={src} onState={onState} />))
  return {
    container,
    rerender: (nextSrc: string | undefined) =>
      act(() => root.render(<Harness src={nextSrc} onState={onState} />)),
    unmount: () => act(() => root.unmount()),
  }
}

Deno.test('useImageLoadState: no src — neither failed nor loaded', () => {
  let state!: ImageLoadState
  const { unmount } = mount(undefined, (value) => (state = value))

  assertEquals(state.failed, false)
  assertEquals(state.loaded, false)

  unmount()
})

Deno.test('useImageLoadState: a real error event sets failed', () => {
  let state!: ImageLoadState
  const { container, unmount } = mount(
    'https://cdn.example.com/broken.jpg',
    (value) => state = value,
  )
  const img = must(container.querySelector('img'))

  act(() => img.dispatchEvent(new Event('error')))

  assertEquals(state.failed, true)
  assertEquals(state.loaded, false)

  unmount()
})

Deno.test('useImageLoadState: a real load event sets loaded', () => {
  let state!: ImageLoadState
  const { container, unmount } = mount('https://cdn.example.com/ok.jpg', (value) => state = value)
  const img = must(container.querySelector('img'))

  act(() => img.dispatchEvent(new Event('load')))

  assertEquals(state.loaded, true)
  assertEquals(state.failed, false)

  unmount()
})

Deno.test(
  'useImageLoadState: an image already broken before mount is detected via a rejected decode()',
  async () => {
    // `happy-dom`'s own `decode()` is a permanently-resolving stub — overridden here to simulate
    // what a real browser reports for an image whose failure already happened before this hook's
    // own effect ever ran, the same technique `avatar.test.tsx`'s own "decode() rejects" test uses.
    const proto = Object.getPrototypeOf(document.createElement('img'))
    const originalDecode = proto.decode
    proto.decode = () => Promise.reject(new Error('simulated already-broken decode'))

    try {
      let state!: ImageLoadState
      const { unmount } = mount('https://cdn.example.com/broken.jpg', (value) => state = value)
      await act(async () => {
        await Promise.resolve()
      })

      assertEquals(state.failed, true)
      assertEquals(state.loaded, false)

      unmount()
    } finally {
      proto.decode = originalDecode
    }
  },
)

Deno.test(
  'useImageLoadState: an image already loaded before mount is detected via a resolved decode()',
  async () => {
    // Exercises `happy-dom`'s own default, always-resolving `decode()` stub directly — the real
    // per-environment behavior a genuinely already-loaded image's `decode()` call would also
    // resolve with in a real browser, no override needed for this direction.
    let state!: ImageLoadState
    const { unmount } = mount('https://cdn.example.com/ok.jpg', (value) => state = value)
    await act(async () => {
      await Promise.resolve()
    })

    assertEquals(state.loaded, true)
    assertEquals(state.failed, false)

    unmount()
  },
)

Deno.test(
  "useImageLoadState: an environment without decode() support doesn't throw and keeps onLoad/onError working",
  async () => {
    const proto = Object.getPrototypeOf(document.createElement('img'))
    const originalDecode = proto.decode
    // deno-lint-ignore no-explicit-any
    delete (proto as any).decode

    try {
      let state!: ImageLoadState
      const { container, unmount } = mount(
        'https://cdn.example.com/broken.jpg',
        (value) => state = value,
      )
      await act(async () => {
        await Promise.resolve()
      })
      assertEquals(state.failed, false)
      assertEquals(state.loaded, false)

      const img = must(container.querySelector('img'))
      act(() => img.dispatchEvent(new Event('error')))
      assertEquals(state.failed, true)

      unmount()
    } finally {
      proto.decode = originalDecode
    }
  },
)

Deno.test('useImageLoadState: a src change resets a prior failed/loaded state', () => {
  let state!: ImageLoadState
  const { container, rerender, unmount } = mount(
    'https://cdn.example.com/broken.jpg',
    (value) => state = value,
  )
  const img = must(container.querySelector('img'))
  act(() => img.dispatchEvent(new Event('error')))
  assertEquals(state.failed, true)

  rerender('https://cdn.example.com/working.jpg')

  assertEquals(state.failed, false)
  assertEquals(state.loaded, false)

  unmount()
})
