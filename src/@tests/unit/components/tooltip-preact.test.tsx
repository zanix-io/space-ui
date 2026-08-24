import { installTimerMock, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Tooltip } from 'components/Tooltip/index.preact.ts'
import type { TooltipProps } from 'components/Tooltip/index.preact.ts'

// Unlike every hookless Preact component in this package, `Tooltip` uses real hooks — built with
// `h(Tooltip, props)` and rendered through Preact's own pipeline. See `counter-preact.test.tsx`'s
// own doc for the same reasoning.

function stubRect(el: Element, rect: { x: number; y: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({
    ...rect,
    top: rect.y,
    left: rect.x,
    right: 0,
    bottom: 0,
    toJSON() {},
  })
}

function element(props: TooltipProps): VNode {
  return h(Tooltip, props) as VNode
}

function mount(props: TooltipProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: TooltipProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function basicProps(open?: boolean): TooltipProps {
  return {
    open,
    content: 'Delete this item',
    trigger: (triggerProps) => h('button', { type: 'button', ...triggerProps }, 'Delete'),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Tooltip (preact): SSR — the panel is in markup, referenced by aria-describedby', () => {
  const html = renderToString(element(basicProps(false)))

  const describedByMatch = must(html.match(/aria-describedby="([^"]+)"/))[1]
  assertStringIncludes(html, 'role="tooltip"')
  assertStringIncludes(html, `id="${describedByMatch}"`)
  assertStringIncludes(html, 'Delete this item')
})

Deno.test('Tooltip (preact): SSR — closed, the panel carries a hidden visibility style', () => {
  const html = renderToString(element(basicProps(false)))

  assertStringIncludes(html, 'visibility:hidden')
})

// --- real DOM: hover open/close, positioning ----------------------------------------------

Deno.test('Tooltip (preact): hovering the trigger opens it — real DOM', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  assertEquals(panel.style.visibility, 'hidden')

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })

  assertEquals(panel.style.visibility, 'visible')

  unmount()
})

Deno.test('Tooltip (preact): the panel is positioned via the trigger reference rect', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
  stubRect(panel, { x: 0, y: 0, width: 80, height: 40 })

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })

  assertEquals(panel.style.position, 'fixed')
  assertStringIncludes(panel.style.transform, 'translate(')

  unmount()
})

Deno.test(
  'Tooltip (preact): a trigger render-prop with no element child never crashes — stays unpositioned',
  () => {
    // `trigger` returning plain text (no wrapping element) means the reference element
    // `usePosition` needs (`triggerWrapperRef.current?.firstElementChild`) is genuinely absent —
    // the `?? null` fallback is what keeps this from throwing.
    const { container, unmount } = mount({
      open: true,
      content: 'Delete this item',
      trigger: () => 'Just text, no element',
    })

    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
    assertEquals(panel.style.transform, '')
    assertEquals(panel.style.visibility, 'hidden')

    unmount()
  },
)

Deno.test('Tooltip (preact): the mouse leaving the trigger closes it', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })
  assertEquals(panel.style.visibility, 'visible')

  act(() => {
    trigger.dispatchEvent(new Event('mouseleave'))
  })
  assertEquals(panel.style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip (preact): focusing the trigger opens it, blurring it closes it', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('focus'))
  })
  assertEquals(panel.style.visibility, 'visible')

  act(() => {
    trigger.dispatchEvent(new Event('blur'))
  })
  assertEquals(panel.style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip (preact): Escape closes it when opened via real keyboard focus', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector<HTMLButtonElement>('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.focus()
  })
  assertEquals(panel.style.visibility, 'visible')

  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(panel.style.visibility, 'hidden')

  unmount()
})

// Same real bug this component's React binding found and fixed — see `index.ts`'s own doc. Proven
// here too, independently, since this is a genuinely separate implementation.
Deno.test('Tooltip (preact): Escape closes a hover-only tooltip too, without reopening it', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector<HTMLButtonElement>('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })
  assertEquals(panel.style.visibility, 'visible')
  assertEquals(document.activeElement === trigger, false)

  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(panel.style.visibility, 'hidden')

  unmount()
})

// --- delays ----------------------------------------------------------------------------------

Deno.test('Tooltip (preact): openDelay defers showing, closeDelay defers hiding', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount({ ...basicProps(), openDelay: 300, closeDelay: 200 })
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new Event('mouseenter'))
    })
    assertEquals(panel.style.visibility, 'hidden')

    act(() => {
      timers.advance(299)
    })
    assertEquals(panel.style.visibility, 'hidden')

    act(() => {
      timers.advance(1)
    })
    assertEquals(panel.style.visibility, 'visible')

    act(() => {
      trigger.dispatchEvent(new Event('mouseleave'))
    })
    assertEquals(panel.style.visibility, 'visible')

    act(() => {
      timers.advance(199)
    })
    assertEquals(panel.style.visibility, 'visible')

    act(() => {
      timers.advance(1)
    })
    assertEquals(panel.style.visibility, 'hidden')

    unmount()
  } finally {
    timers.restore()
  }
})

Deno.test('Tooltip (preact): a mouseleave before openDelay elapses cancels the open', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount({ ...basicProps(), openDelay: 300 })
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new Event('mouseenter'))
    })
    act(() => {
      trigger.dispatchEvent(new Event('mouseleave'))
    })
    act(() => {
      timers.advance(300)
    })

    assertEquals(panel.style.visibility, 'hidden')

    unmount()
  } finally {
    timers.restore()
  }
})

Deno.test('Tooltip (preact): focus bypasses openDelay entirely — opens instantly', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount({ ...basicProps(), openDelay: 300 })
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new Event('focus'))
    })

    assertEquals(panel.style.visibility, 'visible')

    unmount()
  } finally {
    timers.restore()
  }
})

// --- controlled / uncontrolled / onOpenChange -------------------------------------------------

Deno.test('Tooltip (preact): uncontrolled — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onOpenChange: (next) => calls.push(next),
  })
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })

  assertEquals(calls, [true])
  assertEquals(panel.style.visibility, 'visible')

  unmount()
})

Deno.test('Tooltip (preact): controlled — hovering notifies but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(false),
    onOpenChange: (next) => calls.push(next),
  })
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })

  assertEquals(calls, [true])
  assertEquals(panel.style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip (preact): controlled — updating open re-renders, no hover needed', () => {
  const { container, rerender, unmount } = mount(basicProps(false))
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  rerender(basicProps(true))

  assertEquals(panel.style.visibility, 'visible')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Tooltip (preact): id/className land on the panel', () => {
  const { container, unmount } = mount({
    ...basicProps(),
    id: 'delete-tooltip',
    className: 'tooltip-panel',
  })
  const panel = must(container.querySelector('[data-space-ui="tooltip"]'))
  assertEquals(panel.id, 'delete-tooltip')
  assertEquals(panel.className, 'tooltip-panel')

  unmount()
})

Deno.test('Tooltip (preact): the trigger aria-describedby cross-references the panel id', () => {
  const { container, unmount } = mount(basicProps(false))
  const trigger = must(container.querySelector('button'))
  const panel = must(container.querySelector('[data-space-ui="tooltip"]'))

  assertEquals(trigger.getAttribute('aria-describedby'), panel.id)

  unmount()
})
