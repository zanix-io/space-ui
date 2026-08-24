import { installTimerMock, must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Tooltip } from 'components/Tooltip/index.ts'

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

function mount(element: ReturnType<typeof Tooltip>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Tooltip>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function basicTooltip(open?: boolean) {
  return (
    <Tooltip
      open={open}
      content='Delete this item'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />
  )
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Tooltip: SSR — the panel is always in markup, referenced by aria-describedby', () => {
  const html = renderToStaticMarkup(basicTooltip(false))

  const describedByMatch = must(html.match(/aria-describedby="([^"]+)"/))[1]
  assertStringIncludes(html, `role="tooltip"`)
  assertStringIncludes(html, `id="${describedByMatch}"`)
  assertStringIncludes(html, 'Delete this item')
})

Deno.test('Tooltip: SSR — closed, the panel carries a hidden visibility style', () => {
  const html = renderToStaticMarkup(basicTooltip(false))

  assertStringIncludes(html, 'visibility:hidden')
})

// --- real DOM: hover open/close, positioning ----------------------------------------------

Deno.test('Tooltip: hovering the trigger opens it — real DOM', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  assertEquals(panel.style.visibility, 'hidden')

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  assertEquals(panel.style.visibility, 'visible')

  unmount()
})

Deno.test('Tooltip: the panel is positioned via the trigger reference rect', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
  stubRect(panel, { x: 0, y: 0, width: 80, height: 40 })

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  assertEquals(panel.style.position, 'fixed')
  assertStringIncludes(panel.style.transform, 'translate(')

  unmount()
})

Deno.test(
  'Tooltip: a trigger render-prop with no element child never crashes — just stays unpositioned',
  () => {
    // `trigger` returning plain text (no wrapping element) means the reference element `usePosition`
    // needs (`triggerWrapperRef.current?.firstElementChild`) is genuinely absent — the `?? null`
    // fallback is what keeps this from throwing.
    const { container, unmount } = mount(
      <Tooltip open content='Delete this item' trigger={() => 'Just text, no element'} />,
    )

    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
    assertEquals(panel.style.transform, '')
    // `visible = open && position !== null` — with no reference element to measure, `position`
    // never resolves, so the panel stays `open`-requested but never actually shown. Never throws,
    // which is the real contract being tested here.
    assertEquals(panel.style.visibility, 'hidden')

    unmount()
  },
)

Deno.test('Tooltip: the mouse leaving the trigger closes it', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })
  assertEquals(panel.style.visibility, 'visible')

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  })
  assertEquals(panel.style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip: focusing the trigger opens it, blurring it closes it', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  assertEquals(panel.style.visibility, 'visible')

  act(() => {
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
  assertEquals(panel.style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip: Escape closes it when opened via real keyboard focus', () => {
  const { container, unmount } = mount(basicTooltip())
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

// A real, confirmed bug caught by this exact test while building `Tooltip`: an earlier version
// wired `Escape` to the trigger's own `onKeyDown` via `createEscapeToCloseHandler` (the same shape
// `Popover` uses), which refocuses the trigger on close — but when the tooltip was opened by mouse
// hover alone (never a real focus change), that refocus call fires a genuine `focusin` event,
// which this component's own `onFocus` handler treats as "open," undoing the close immediately.
// Fixed by moving `Escape` to a document-level listener with no refocus side effect at all — see
// `index.ts`'s own doc for the full explanation.
Deno.test('Tooltip: Escape closes a hover-only tooltip too, without reopening it', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector<HTMLButtonElement>('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
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

Deno.test('Tooltip: openDelay defers showing until it elapses, closeDelay defers hiding', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount(
      <Tooltip
        openDelay={300}
        closeDelay={200}
        content='Delete this item'
        trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
      />,
    )
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
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
      trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
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

Deno.test('Tooltip: a mouseleave before openDelay elapses cancels the pending open', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount(
      <Tooltip
        openDelay={300}
        content='Delete this item'
        trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
      />,
    )
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
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

Deno.test('Tooltip: focus bypasses openDelay entirely — opens instantly', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount(
      <Tooltip
        openDelay={300}
        content='Delete this item'
        trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
      />,
    )
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })

    assertEquals(panel.style.visibility, 'visible')

    unmount()
  } finally {
    timers.restore()
  }
})

// --- controlled / uncontrolled / onOpenChange -------------------------------------------------

Deno.test('Tooltip: uncontrolled — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Tooltip
      onOpenChange={(next) => calls.push(next)}
      content='Delete this item'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />,
  )
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(panel.style.visibility, 'visible')

  unmount()
})

Deno.test('Tooltip: controlled — hovering notifies onOpenChange but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Tooltip
      open={false}
      onOpenChange={(next) => calls.push(next)}
      content='Delete this item'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />,
  )
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(panel.style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip: controlled — updating open from outside re-renders, no hover needed', () => {
  const { container, rerender, unmount } = mount(basicTooltip(false))
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  rerender(basicTooltip(true))

  assertEquals(panel.style.visibility, 'visible')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Tooltip: id/className land on the panel', () => {
  const { container, unmount } = mount(
    <Tooltip
      id='delete-tooltip'
      className='tooltip-panel'
      content='Delete this item'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />,
  )
  const panel = must(container.querySelector('[data-space-ui="tooltip"]'))
  assertEquals(panel.id, 'delete-tooltip')
  assertEquals(panel.className, 'tooltip-panel')

  unmount()
})

Deno.test('Tooltip: the trigger carries aria-describedby cross-referencing the panel id', () => {
  const { container, unmount } = mount(basicTooltip(false))
  const trigger = must(container.querySelector('button'))
  const panel = must(container.querySelector('[data-space-ui="tooltip"]'))

  assertEquals(trigger.getAttribute('aria-describedby'), panel.id)

  unmount()
})
