import './dom-test-setup.ts'
import { act, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { useFocusScope } from 'shared/focus-scope.ts'
import type { FocusScopeOptions, TabKeyEvent } from 'shared/focus-scope.ts'

type ContainerRef = { current: HTMLElement | null }
type Handler = (event: TabKeyEvent) => void
type Ready = { containerRef: ContainerRef; handler: Handler }

function fakeTabEvent(shiftKey = false) {
  let prevented = false
  return {
    event: { key: 'Tab', shiftKey, preventDefault: () => (prevented = true) },
    wasPrevented: () => prevented,
  }
}

function Harness(
  { active, options, onReady, focusable = true, hiddenFirst = false }: {
    active: boolean
    options?: FocusScopeOptions
    onReady: (info: Ready) => void
    focusable?: boolean
    /** Renders an extra focusable button first, wrapped in a `hidden` ancestor. */
    hiddenFirst?: boolean
  },
) {
  const containerRef = useRef<HTMLElement | null>(null)
  const handler = useFocusScope(containerRef, active, options)
  onReady({ containerRef, handler })

  return (
    <div ref={containerRef as never}>
      {hiddenFirst && (
        <div hidden>
          <button type='button'>hidden</button>
        </div>
      )}
      {focusable && (
        <>
          <button type='button'>one</button>
          <button type='button'>two</button>
        </>
      )}
    </div>
  )
}

function mount(
  active: boolean,
  options: FocusScopeOptions | undefined,
  onReady: (info: Ready) => void,
  focusable = true,
  hiddenFirst = false,
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() =>
    root.render(
      <Harness
        active={active}
        options={options}
        onReady={onReady}
        focusable={focusable}
        hiddenFirst={hiddenFirst}
      />,
    )
  )

  return {
    rerender: (nextActive: boolean, nextOptions?: FocusScopeOptions) =>
      act(() =>
        root.render(
          <Harness
            active={nextActive}
            options={nextOptions}
            onReady={onReady}
            focusable={focusable}
            hiddenFirst={hiddenFirst}
          />,
        )
      ),
    unmount: () => act(() => root.unmount()),
  }
}

// --- Tab handler: container/focusable edge cases — never exercised via Modal/Drawer's own real
// usage, since both always keep a real, non-empty container attached while the scope is active. ---

Deno.test('useFocusScope: the Tab handler is a no-op once the container ref has detached', () => {
  let info: Ready | undefined
  const { unmount } = mount(true, undefined, (i) => (info = i))
  if (!info) throw new Error('harness did not report')

  info.containerRef.current = null
  const { event, wasPrevented } = fakeTabEvent()
  info.handler(event) // must not throw when there's no container left to query

  assertEquals(wasPrevented(), false)
  unmount()
})

Deno.test(
  'useFocusScope: the Tab handler prevents default when the container has no focusable descendants',
  () => {
    let info: Ready | undefined
    const { unmount } = mount(true, undefined, (i) => (info = i))
    if (!info) throw new Error('harness did not report')

    info.containerRef.current = document.createElement('div') // real, but empty
    const { event, wasPrevented } = fakeTabEvent()
    info.handler(event)

    assertEquals(wasPrevented(), true)
    unmount()
  },
)

// --- initial focus target: index-out-of-range fallback ----------------------------------------

Deno.test(
  'useFocusScope: an out-of-range initialFocusIndex falls back to the first focusable',
  () => {
    const { unmount } = mount(true, { initialFocusIndex: 5 }, () => {})

    assertEquals(document.activeElement?.textContent, 'one')

    unmount()
  },
)

Deno.test(
  'useFocusScope: zero focusable descendants — the container itself becomes the target',
  () => {
    // The doc's own "falls back... to the container itself" case — `focusables[initialFocusIndex]
    // ?? focusables[0] ?? container` only reaches its own final `?? container` when there is truly
    // nothing focusable inside, which `Modal`/`Drawer` never trigger (both always render at least
    // one focusable descendant, e.g. their own close button).
    const originalFocus = HTMLElement.prototype.focus
    const focusedEls: HTMLElement[] = []
    HTMLElement.prototype.focus = function (this: HTMLElement) {
      focusedEls.push(this)
    }

    let info: Ready | undefined
    const { unmount } = mount(true, undefined, (i) => (info = i), false)
    if (!info) throw new Error('harness did not report')

    assertEquals(focusedEls, [info.containerRef.current])

    HTMLElement.prototype.focus = originalFocus
    unmount()
  },
)

// --- shouldRestoreFocus default — every real consumer (Modal/Drawer) supplies its own predicate,
// so the default `() => true` identity is never otherwise invoked. ------------------------------

Deno.test(
  'useFocusScope: deactivating without a shouldRestoreFocus option still restores focus',
  () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    assertEquals(document.activeElement, trigger)

    const { rerender, unmount } = mount(true, undefined, () => {})
    assertEquals(document.activeElement?.textContent, 'one') // scope took focus

    rerender(false) // runs the effect cleanup, calling the default shouldRestoreFocus()

    assertEquals(document.activeElement, trigger) // restored

    unmount()
    trigger.remove()
  },
)

// --- a hidden ancestor is never a valid focus target ---------------------------------------------

Deno.test(
  'useFocusScope: a focusable element inside a hidden ancestor is skipped for initial focus',
  () => {
    const { unmount } = mount(true, undefined, () => {}, true, true)

    assertEquals(document.activeElement?.textContent, 'one')

    unmount()
  },
)

Deno.test(
  'useFocusScope: Tab-cycling skips a focusable element inside a hidden ancestor too',
  () => {
    let info: Ready | undefined
    const { unmount } = mount(true, undefined, (i) => (info = i), true, true)
    if (!info) throw new Error('harness did not report')

    const buttons = info.containerRef.current?.querySelectorAll<HTMLButtonElement>('button')
    const second = buttons?.[buttons.length - 1]
    if (!second) throw new Error('expected a second button')
    act(() => second.focus())
    assertEquals(document.activeElement?.textContent, 'two')

    const { event, wasPrevented } = fakeTabEvent()
    info.handler(event)

    assertEquals(wasPrevented(), true)
    assertEquals(document.activeElement?.textContent, 'one')

    unmount()
  },
)

// --- a hidden <input type="hidden"> is never a valid focus target -------------------------------

Deno.test('useFocusScope: a hidden <input type="hidden"> is skipped for initial focus', () => {
  function HiddenInputHarness({ onReady }: { onReady: (info: Ready) => void }) {
    const containerRef = useRef<HTMLElement | null>(null)
    const handler = useFocusScope(containerRef, true, { initialFocusIndex: 1 })
    onReady({ containerRef, handler })
    return (
      <div ref={containerRef as never}>
        <button type='button'>close</button>
        <input type='hidden' name='_csrf' value='token' />
        <button type='button'>real field</button>
      </div>
    )
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let info: Ready | undefined
  act(() => root.render(<HiddenInputHarness onReady={(i) => (info = i)} />))
  if (!info) throw new Error('harness did not report')

  assertEquals(document.activeElement?.textContent, 'real field')

  act(() => root.unmount())
})
