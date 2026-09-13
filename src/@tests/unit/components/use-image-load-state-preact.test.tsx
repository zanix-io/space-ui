import './dom-test-setup.ts'
import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { useRef } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { assertEquals } from '@std/assert'
import { useImageLoadState } from 'shared/use-image-load-state.preact.ts'
import type { ImageLoadState } from 'shared/use-image-load-state.preact.ts'

// Unlike every hookless Preact component in this package, `useImageLoadState` is a real hook —
// built with `h(Harness, props)` and rendered through Preact's own pipeline, same reasoning
// `use-position-preact.test.tsx`'s own doc already establishes.

function Harness(
  { src, onState }: { src: string | undefined; onState: (state: ImageLoadState) => void },
): VNode {
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const state = useImageLoadState(src, rootRef)
  onState(state)

  return h(
    'span',
    { ref: rootRef },
    src ? h('img', { src, onLoad: state.onLoad, onError: state.onError }) : null,
  ) as VNode
}

function mount(src: string | undefined, onState: (state: ImageLoadState) => void) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(h(Harness, { src, onState }) as VNode, container))
  return {
    container,
    rerender: (nextSrc: string | undefined) =>
      act(() => renderDOM(h(Harness, { src: nextSrc, onState }) as VNode, container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('useImageLoadState (preact): no src — neither failed nor loaded', () => {
  let state!: ImageLoadState
  const { unmount } = mount(undefined, (value) => (state = value))

  assertEquals(state.failed, false)
  assertEquals(state.loaded, false)

  unmount()
})

Deno.test('useImageLoadState (preact): a real error event sets failed', () => {
  let state!: ImageLoadState
  const { container, unmount } = mount(
    'https://cdn.example.com/broken.jpg',
    (value) => state = value,
  )
  const img = must(container.querySelector('img'))

  act(() => {
    img.dispatchEvent(new Event('error'))
  })

  assertEquals(state.failed, true)
  assertEquals(state.loaded, false)

  unmount()
})

Deno.test('useImageLoadState (preact): a real load event sets loaded', () => {
  let state!: ImageLoadState
  const { container, unmount } = mount('https://cdn.example.com/ok.jpg', (value) => state = value)
  const img = must(container.querySelector('img'))

  act(() => {
    img.dispatchEvent(new Event('load'))
  })

  assertEquals(state.loaded, true)
  assertEquals(state.failed, false)

  unmount()
})

Deno.test(
  'useImageLoadState (preact): an image already broken before mount is detected via a rejected decode()',
  async () => {
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
  'useImageLoadState (preact): an image already loaded before mount is detected via a resolved decode()',
  async () => {
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

Deno.test('useImageLoadState (preact): a src change resets a prior failed/loaded state', () => {
  let state!: ImageLoadState
  const { container, rerender, unmount } = mount(
    'https://cdn.example.com/broken.jpg',
    (value) => state = value,
  )
  const img = must(container.querySelector('img'))
  act(() => {
    img.dispatchEvent(new Event('error'))
  })
  assertEquals(state.failed, true)

  rerender('https://cdn.example.com/working.jpg')

  assertEquals(state.failed, false)
  assertEquals(state.loaded, false)

  unmount()
})
