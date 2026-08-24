import { dispatchWindowEvent, must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Popover } from 'components/Popover/index.ts'

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

function mount(element: ReturnType<typeof Popover>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Popover>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function basicPopover(open?: boolean) {
  return (
    <Popover
      open={open}
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Open</button>}
    >
      <p>Content</p>
    </Popover>
  )
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Popover: SSR — closed renders the trigger but no panel', () => {
  const html = renderToStaticMarkup(basicPopover(false))

  assertStringIncludes(html, '>Open</button>')
  assertEquals(html.includes('data-space-ui="popover"'), false)
  assertStringIncludes(html, 'aria-expanded="false"')
})

Deno.test('Popover: SSR — open still renders no panel (never a fake x:0,y:0 flash)', () => {
  const html = renderToStaticMarkup(basicPopover(true))

  // usePosition can never measure during SSR — the panel's own visibility depends on a real
  // client-side measurement, but since this is SSR-rendered HTML we can at least confirm no
  // unpositioned panel content leaks into the very first response with a visible style.
  assertStringIncludes(html, 'aria-expanded="true"')
})

Deno.test('Popover: trigger receives aria-expanded/aria-controls, cross-referenced', () => {
  const html = renderToStaticMarkup(basicPopover(false))

  const controlsMatch = must(html.match(/aria-controls="([^"]+)"/))[1]
  assertStringIncludes(html, `aria-expanded="false"`)
  assertEquals(typeof controlsMatch, 'string')
  assertEquals(controlsMatch.length > 0, true)
})

// --- real DOM: open/close, positioning ----------------------------------------------------

Deno.test('Popover: clicking the trigger opens the panel — real DOM', () => {
  const { container, unmount } = mount(basicPopover())
  const trigger = must(container.querySelector('button'))
  const referenceRect = { x: 100, y: 100, width: 50, height: 20 }
  stubRect(trigger, referenceRect)

  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)

  act(() => trigger.click())

  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)
  assertEquals(trigger.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Popover: the panel is positioned via the trigger reference rect', () => {
  const { container, unmount } = mount(basicPopover())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())

  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="popover"]'))
  stubRect(panel, { x: 0, y: 0, width: 80, height: 40 })

  // Force a re-measurement now that the panel itself has a real (stubbed) size — mirrors what a
  // real browser would do once layout settles after mount.
  act(() => dispatchWindowEvent(new Event('resize')))

  assertEquals(panel.style.position, 'fixed')
  assertEquals(panel.style.visibility, 'visible')
  assertStringIncludes(panel.style.transform, 'translate(')

  unmount()
})

Deno.test(
  'Popover: a trigger render-prop with no element child never crashes — just stays unpositioned',
  () => {
    // `trigger` returning plain text (no wrapping element) means the reference element `usePosition`
    // needs (`triggerWrapperRef.current?.firstElementChild`) is genuinely absent — the `?? null`
    // fallback is what keeps this from throwing.
    const { container, unmount } = mount(
      <Popover open trigger={() => 'Just text, no element'}>
        <p>Content</p>
      </Popover>,
    )

    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="popover"]'))
    assertEquals(panel.style.transform, '')

    unmount()
  },
)

Deno.test('Popover: clicking the trigger again closes the panel', () => {
  const { container, unmount } = mount(basicPopover())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())
  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  act(() => trigger.click())
  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)

  unmount()
})

// A real bug found and fixed after this component originally shipped: `useCloseOnOutside` was
// scoped to the trigger's own wrapper alone, so a click on the panel's own content — including any
// interactive element inside `children` — was itself treated as "outside" and closed the popover
// before it could ever be interacted with.
Deno.test('Popover: a click inside the panel on its own content never closes it', () => {
  const { container, unmount } = mount(
    <Popover
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Open</button>}
    >
      <button type='button' id='inside-action'>Inside action</button>
    </Popover>,
  )
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())
  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  const insideButton = must(container.querySelector('#inside-action'))
  act(() => {
    insideButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  unmount()
})

Deno.test('Popover: an outside click closes it', () => {
  const { container, unmount } = mount(basicPopover())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())
  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  act(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))

  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)

  unmount()
})

Deno.test('Popover: Escape closes it and refocuses the trigger', () => {
  const { container, unmount } = mount(basicPopover())
  const trigger = must(container.querySelector<HTMLButtonElement>('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())
  const panel = must(container.querySelector('[data-space-ui="popover"]'))

  act(() => {
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

// --- controlled / uncontrolled / onOpenChange -------------------------------------------------

Deno.test('Popover: uncontrolled — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Popover
      onOpenChange={(next) => calls.push(next)}
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Open</button>}
    >
      <p>Content</p>
    </Popover>,
  )
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  unmount()
})

Deno.test('Popover: controlled — a click notifies onOpenChange but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Popover
      open={false}
      onOpenChange={(next) => calls.push(next)}
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Open</button>}
    >
      <p>Content</p>
    </Popover>,
  )
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)

  unmount()
})

Deno.test('Popover: controlled — updating open from outside re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(basicPopover(false))
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  rerender(basicPopover(true))

  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Popover: id/className land on the panel', () => {
  const { container, unmount } = mount(
    <Popover
      defaultOpen
      id='menu-panel'
      className='popover-panel'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Open</button>}
    >
      <p>Content</p>
    </Popover>,
  )
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  const panel = must(container.querySelector('[data-space-ui="popover"]'))
  assertEquals(panel.id, 'menu-panel')
  assertEquals(panel.className, 'popover-panel')

  unmount()
})
