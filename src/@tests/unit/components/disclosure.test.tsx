import { must } from './dom-test-setup.ts'
import { act, useState } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Disclosure } from 'components/Disclosure/index.ts'

function mount(element: ReturnType<typeof Disclosure>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Disclosure>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Disclosure: SSR — closed by default, content present but hidden, not omitted', () => {
  const html = renderToStaticMarkup(
    <Disclosure trigger='FAQ question'>The answer, crawlable even collapsed.</Disclosure>,
  )

  assertStringIncludes(html, 'aria-expanded="false"')
  assertStringIncludes(html, 'The answer, crawlable even collapsed.')
  assertStringIncludes(html, 'hidden=""')
})

Deno.test('Disclosure: SSR — defaultOpen renders expanded, no hidden attribute', () => {
  const html = renderToStaticMarkup(
    <Disclosure trigger='FAQ question' defaultOpen>Answer</Disclosure>,
  )

  assertStringIncludes(html, 'aria-expanded="true"')
  assertEquals(html.includes('hidden'), false)
})

Deno.test('Disclosure: id/className land on the wrapper only — never the button or content', () => {
  const html = renderToStaticMarkup(
    <Disclosure trigger='Q' id='faq-1' className='faq-item'>A</Disclosure>,
  )

  assertStringIncludes(html, 'data-space-ui="disclosure"')
  const wrapperMatch = html.match(/<div id="faq-1" class="faq-item"[^>]*>/)
  assertEquals(wrapperMatch !== null, true)
  assertEquals(html.includes('<button id="faq-1"'), false)
  assertEquals(html.includes('class="faq-item"', html.indexOf('</button>')), false)
})

Deno.test('Disclosure: trigger content renders inside the <button>', () => {
  const html = renderToStaticMarkup(<Disclosure trigger='Open me'>content</Disclosure>)

  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'Open me</button>')
})

Deno.test('Disclosure: the trigger button is type="button" — never submits a wrapping form', () => {
  const html = renderToStaticMarkup(<Disclosure trigger='Q'>A</Disclosure>)

  assertStringIncludes(html, 'type="button"')
})

Deno.test('Disclosure: aria-controls/aria-labelledby cross-reference correctly', () => {
  const html = renderToStaticMarkup(<Disclosure trigger='Q'>A</Disclosure>)

  const buttonIdMatch = must(html.match(/<button id="([^"]+)"/))
  const controlsMatch = must(html.match(/aria-controls="([^"]+)"/))
  const contentIdMatch = must(html.match(/<div id="([^"]+)" aria-labelledby/))
  const labelledByMatch = must(html.match(/aria-labelledby="([^"]+)"/))

  assertEquals(controlsMatch[1], contentIdMatch[1])
  assertEquals(labelledByMatch[1], buttonIdMatch[1])
})

// --- form-submit safety ----------------------------------------------------------------------

Deno.test('Disclosure: clicking the trigger inside a <form> never submits it', () => {
  let submitted = false
  const { container, unmount } = mount(
    <form onSubmit={(event) => (event.preventDefault(), (submitted = true))}>
      <Disclosure trigger='Q'>A</Disclosure>
    </form>,
  )
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(submitted, false)

  unmount()
})

// --- real DOM: content stays present, only hidden ------------------------------------------

Deno.test('Disclosure: closed content is present, only [hidden] — never unmounted', () => {
  const { container, unmount } = mount(<Disclosure trigger='Q'>The answer text</Disclosure>)

  const content = must(container.querySelector('[aria-labelledby]'))
  assertEquals(content.hasAttribute('hidden'), true)
  assertEquals(content.textContent, 'The answer text')

  unmount()
})

Deno.test('Disclosure: clicking the trigger toggles aria-expanded and [hidden], real DOM', () => {
  const { container, unmount } = mount(<Disclosure trigger='Q'>A</Disclosure>)
  const button = must(container.querySelector<HTMLButtonElement>('button'))
  const content = must(container.querySelector('[aria-labelledby]'))

  assertEquals(button.getAttribute('aria-expanded'), 'false')
  assertEquals(content.hasAttribute('hidden'), true)

  act(() => button.click())

  assertEquals(button.getAttribute('aria-expanded'), 'true')
  assertEquals(content.hasAttribute('hidden'), false)

  act(() => button.click())

  assertEquals(button.getAttribute('aria-expanded'), 'false')
  assertEquals(content.hasAttribute('hidden'), true)

  unmount()
})

// --- open / defaultOpen / onOpenChange ------------------------------------------------------

Deno.test('Disclosure: uncontrolled — onOpenChange fires, still opens on its own', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Disclosure trigger='Q' onOpenChange={(next) => calls.push(next)}>A</Disclosure>,
  )
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(calls, [true])
  assertEquals(button.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Disclosure: controlled — a click notifies onOpenChange but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Disclosure trigger='Q' open={false} onOpenChange={(next) => calls.push(next)}>A</Disclosure>,
  )
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(calls, [true])
  assertEquals(button.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Disclosure: controlled — updating open from outside re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(
    <Disclosure trigger='Q' open={false}>A</Disclosure>,
  )

  assertEquals(
    must(container.querySelector<HTMLButtonElement>('button')).getAttribute('aria-expanded'),
    'false',
  )

  rerender(<Disclosure trigger='Q' open>A</Disclosure>)

  assertEquals(
    must(container.querySelector<HTMLButtonElement>('button')).getAttribute('aria-expanded'),
    'true',
  )

  unmount()
})

Deno.test('Disclosure: controlled — a full click round-trip via real external state', () => {
  function Wrapper() {
    const [open, setOpen] = useState(false)
    return (
      <Disclosure trigger='Q' open={open} onOpenChange={setOpen}>
        A
      </Disclosure>
    )
  }
  const { container, unmount } = mount(<Wrapper />)
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  assertEquals(button.getAttribute('aria-expanded'), 'false')
  act(() => button.click())
  assertEquals(button.getAttribute('aria-expanded'), 'true')
  act(() => button.click())
  assertEquals(button.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Disclosure: open takes precedence over defaultOpen when both are given', () => {
  const closed = renderToStaticMarkup(
    <Disclosure trigger='Q' open={false} defaultOpen>A</Disclosure>,
  )
  assertStringIncludes(closed, 'aria-expanded="false"')

  const open = renderToStaticMarkup(
    <Disclosure trigger='Q' open defaultOpen={false}>A</Disclosure>,
  )
  assertStringIncludes(open, 'aria-expanded="true"')
})

Deno.test('Disclosure: onOpenChange fires on both the open AND the close transition', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Disclosure trigger='Q' onOpenChange={(next) => calls.push(next)}>A</Disclosure>,
  )
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click()) // open
  act(() => button.click()) // close

  assertEquals(calls, [true, false])

  unmount()
})

// --- trigger accepts arbitrary content, no cloneElement -------------------------------------

Deno.test('Disclosure: trigger accepts a fragment (icon + text), no cloneElement involved', () => {
  const html = renderToStaticMarkup(
    <Disclosure
      trigger={
        <>
          <span aria-hidden='true'>▶</span>
          <span>Question</span>
        </>
      }
    >
      Answer
    </Disclosure>,
  )

  assertStringIncludes(html, '<span aria-hidden="true">▶</span>')
  assertStringIncludes(html, '<span>Question</span>')
})

// --- SSR → hydration -------------------------------------------------------------------------

Deno.test('Disclosure: SSR markup hydrates cleanly (matching useId ids, no console error)', () => {
  const element = <Disclosure trigger='Q'>A</Disclosure>
  const html = renderToStaticMarkup(element)

  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)

  const errors: unknown[] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => errors.push(args)

  let root!: ReturnType<typeof hydrateRoot>
  act(() => {
    root = hydrateRoot(container, element)
  })
  console.error = originalError

  assertEquals(errors, [])

  // Confirm it's actually interactive post-hydration, not just silently mismatched-and-replaced.
  const button = must(container.querySelector<HTMLButtonElement>('button'))
  act(() => button.click())
  assertEquals(button.getAttribute('aria-expanded'), 'true')

  act(() => root.unmount())
})

// --- hidden vs. unmount: why it matters ------------------------------------------------------

Deno.test('Disclosure: a stateful child keeps state across close→open — hidden, not gone', () => {
  const { container, unmount } = mount(
    <Disclosure trigger='Q' defaultOpen>
      <input defaultValue='hello' />
    </Disclosure>,
  )
  const button = must(container.querySelector<HTMLButtonElement>('button'))
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.value = 'edited by the user'
  })

  act(() => button.click()) // close
  act(() => button.click()) // reopen

  // Same DOM node, same uncommitted value — proof the subtree was never unmounted in between.
  assertEquals(container.querySelector('input'), input)
  assertEquals(input.value, 'edited by the user')

  unmount()
})
