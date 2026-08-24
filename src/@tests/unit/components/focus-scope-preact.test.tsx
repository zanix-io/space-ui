import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { useRef } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { assertEquals } from '@std/assert'
import { useFocusScope } from 'shared/focus-scope.preact.ts'
import type { FocusScopeOptions, TabKeyEvent } from 'shared/focus-scope.preact.ts'

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
  { active, options, onReady, focusable = true }: {
    active: boolean
    options?: FocusScopeOptions
    onReady: (info: Ready) => void
    focusable?: boolean
  },
) {
  const containerRef = useRef<HTMLElement | null>(null)
  const handler = useFocusScope(containerRef, active, options)
  onReady({ containerRef, handler })

  return h(
    'div',
    { ref: containerRef },
    focusable
      ? [
        h('button', { type: 'button' }, 'one'),
        h('button', { type: 'button' }, 'two'),
      ]
      : null,
  )
}

function element(
  active: boolean,
  options: FocusScopeOptions | undefined,
  onReady: (info: Ready) => void,
  focusable = true,
): VNode {
  return h(Harness, { active, options, onReady, focusable }) as VNode
}

function mount(
  active: boolean,
  options: FocusScopeOptions | undefined,
  onReady: (info: Ready) => void,
  focusable = true,
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(active, options, onReady, focusable), container))

  return {
    rerender: (nextActive: boolean, nextOptions?: FocusScopeOptions) =>
      act(() => renderDOM(element(nextActive, nextOptions, onReady, focusable), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

// --- Tab handler: container/focusable edge cases — never exercised via Drawer/Menu's own real
// usage, since both always keep a real, non-empty container attached while the scope is active. ---

Deno.test(
  'useFocusScope (preact): the Tab handler is a no-op once the container ref has detached',
  () => {
    let info: Ready | undefined
    const { unmount } = mount(true, undefined, (i) => (info = i))
    if (!info) throw new Error('harness did not report')

    info.containerRef.current = null
    const { event, wasPrevented } = fakeTabEvent()
    info.handler(event) // must not throw when there's no container left to query

    assertEquals(wasPrevented(), false)
    unmount()
  },
)

Deno.test(
  'useFocusScope (preact): Tab prevents default when the container has no focusable descendants',
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
  'useFocusScope (preact): an out-of-range initialFocusIndex falls back to the first focusable',
  () => {
    const { unmount } = mount(true, { initialFocusIndex: 5 }, () => {})

    assertEquals(document.activeElement?.textContent, 'one')

    unmount()
  },
)

Deno.test(
  'useFocusScope (preact): zero focusable descendants — the container itself becomes the target',
  () => {
    // The doc's own "falls back... to the container itself" case — `focusables[initialFocusIndex]
    // ?? focusables[0] ?? container` only reaches its own final `?? container` when there is truly
    // nothing focusable inside, which no real consumer triggers (both always render at least one
    // focusable descendant, e.g. their own close button).
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

// --- shouldRestoreFocus default — every real consumer supplies its own predicate, so the default
// `() => true` identity is never otherwise invoked. ---------------------------------------------

Deno.test(
  'useFocusScope (preact): deactivating without a shouldRestoreFocus option still restores focus',
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
