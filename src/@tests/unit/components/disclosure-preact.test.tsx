import { must } from './dom-test-setup.ts'
import { Fragment, h, hydrate, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { useState } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Disclosure } from 'components/Disclosure/index.preact.ts'
import type { DisclosureProps } from 'components/Disclosure/index.preact.ts'

// Unlike every hookless Preact component in this package, `Disclosure` uses real hooks — built
// with `h(Disclosure, props)` and rendered through Preact's own pipeline, not called as a plain
// function. See `counter-preact.test.tsx`'s own doc for the same reasoning.

function element(props: DisclosureProps): VNode {
  return h(Disclosure, props) as VNode
}

function mount(props: DisclosureProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: DisclosureProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function mountVNode<P>(vnode: VNode<P>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(vnode, container))
  return {
    container,
    unmount: () => act(() => renderDOM(null, container)),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Disclosure (preact): SSR — closed by default, content present but hidden', () => {
  const html = renderToString(
    element({ trigger: 'FAQ question', children: 'The answer, crawlable even collapsed.' }),
  )

  assertStringIncludes(html, 'aria-expanded="false"')
  assertStringIncludes(html, 'The answer, crawlable even collapsed.')
  assertStringIncludes(html, 'hidden')
})

Deno.test('Disclosure (preact): SSR — defaultOpen renders expanded, no hidden attribute', () => {
  const html = renderToString(
    element({ trigger: 'FAQ question', children: 'Answer', defaultOpen: true }),
  )

  assertStringIncludes(html, 'aria-expanded="true"')
  assertEquals(html.includes('hidden'), false)
})

Deno.test('Disclosure (preact): id/className land on wrapper only — never button/content', () => {
  const html = renderToString(
    element({ trigger: 'Q', children: 'A', id: 'faq-1', className: 'faq-item' }),
  )

  assertStringIncludes(html, 'data-space-ui="disclosure"')
  const wrapperMatch = html.match(/<div id="faq-1" class="faq-item"[^>]*>/)
  assertEquals(wrapperMatch !== null, true)
  assertEquals(html.includes('<button id="faq-1"'), false)
  assertEquals(html.includes('class="faq-item"', html.indexOf('</button>')), false)
})

Deno.test('Disclosure (preact): trigger content renders inside the <button>', () => {
  const html = renderToString(element({ trigger: 'Open me', children: 'content' }))

  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'Open me</button>')
})

Deno.test('Disclosure (preact): the trigger button is type="button"', () => {
  const html = renderToString(element({ trigger: 'Q', children: 'A' }))

  assertStringIncludes(html, 'type="button"')
})

Deno.test('Disclosure (preact): aria-controls/aria-labelledby cross-reference correctly', () => {
  const html = renderToString(element({ trigger: 'Q', children: 'A' }))

  const buttonIdMatch = must(html.match(/<button id="([^"]+)"/))
  const controlsMatch = must(html.match(/aria-controls="([^"]+)"/))
  const contentIdMatch = must(html.match(/<div id="([^"]+)" aria-labelledby/))
  const labelledByMatch = must(html.match(/aria-labelledby="([^"]+)"/))

  assertEquals(controlsMatch[1], contentIdMatch[1])
  assertEquals(labelledByMatch[1], buttonIdMatch[1])
})

// --- form-submit safety ----------------------------------------------------------------------

Deno.test('Disclosure (preact): clicking the trigger inside a <form> never submits it', () => {
  let submitted = false
  const { container, unmount } = mountVNode(
    h(
      'form',
      {
        onSubmit: (event: Event) => {
          event.preventDefault()
          submitted = true
        },
      },
      element({ trigger: 'Q', children: 'A' }),
    ),
  )
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(submitted, false)

  unmount()
})

// --- real DOM: content stays present, only hidden ------------------------------------------

Deno.test('Disclosure (preact): closed content is present in the DOM, only [hidden]', () => {
  const { container, unmount } = mount({ trigger: 'Q', children: 'The answer text' })

  const content = must(container.querySelector('[aria-labelledby]'))
  assertEquals(content.hasAttribute('hidden'), true)
  assertEquals(content.textContent, 'The answer text')

  unmount()
})

Deno.test('Disclosure (preact): clicking the trigger toggles aria-expanded and [hidden]', () => {
  const { container, unmount } = mount({ trigger: 'Q', children: 'A' })
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

Deno.test('Disclosure (preact): uncontrolled — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    trigger: 'Q',
    children: 'A',
    onOpenChange: (next) => calls.push(next),
  })
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(calls, [true])
  assertEquals(button.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Disclosure (preact): controlled — click notifies onOpenChange, never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    trigger: 'Q',
    children: 'A',
    open: false,
    onOpenChange: (next) => calls.push(next),
  })
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(calls, [true])
  assertEquals(button.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Disclosure (preact): controlled — updating open re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount({ trigger: 'Q', children: 'A', open: false })

  assertEquals(
    must(container.querySelector<HTMLButtonElement>('button')).getAttribute('aria-expanded'),
    'false',
  )

  rerender({ trigger: 'Q', children: 'A', open: true })

  assertEquals(
    must(container.querySelector<HTMLButtonElement>('button')).getAttribute('aria-expanded'),
    'true',
  )

  unmount()
})

Deno.test('Disclosure (preact): controlled — full click round-trip via external state', () => {
  function Wrapper() {
    const [open, setOpen] = useState(false)
    return h(Disclosure, { trigger: 'Q', children: 'A', open, onOpenChange: setOpen })
  }
  const { container, unmount } = mountVNode(h(Wrapper, {}))
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  assertEquals(button.getAttribute('aria-expanded'), 'false')
  act(() => button.click())
  assertEquals(button.getAttribute('aria-expanded'), 'true')
  act(() => button.click())
  assertEquals(button.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Disclosure (preact): open takes precedence over defaultOpen when both are given', () => {
  const closed = renderToString(
    element({ trigger: 'Q', children: 'A', open: false, defaultOpen: true }),
  )
  assertStringIncludes(closed, 'aria-expanded="false"')

  const open = renderToString(
    element({ trigger: 'Q', children: 'A', open: true, defaultOpen: false }),
  )
  assertStringIncludes(open, 'aria-expanded="true"')
})

Deno.test('Disclosure (preact): onOpenChange fires on both open AND close', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    trigger: 'Q',
    children: 'A',
    onOpenChange: (next) => calls.push(next),
  })
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click()) // open
  act(() => button.click()) // close

  assertEquals(calls, [true, false])

  unmount()
})

// --- trigger accepts arbitrary content, no cloneElement -------------------------------------

Deno.test('Disclosure (preact): trigger accepts a fragment (icon + text), no cloneElement', () => {
  const html = renderToString(
    element({
      trigger: h(
        Fragment,
        {},
        h('span', { 'aria-hidden': 'true' }, '▶'),
        h('span', {}, 'Question'),
      ),
      children: 'Answer',
    }),
  )

  assertStringIncludes(html, '<span aria-hidden="true">▶</span>')
  assertStringIncludes(html, '<span>Question</span>')
})

// --- SSR → hydration -------------------------------------------------------------------------

Deno.test('Disclosure (preact): SSR markup hydrates cleanly, no console error', () => {
  const vnode = element({ trigger: 'Q', children: 'A' })
  const html = renderToString(vnode)

  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)

  const errors: unknown[] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => errors.push(args)

  act(() => hydrate(vnode, container))
  console.error = originalError

  assertEquals(errors, [])

  const button = must(container.querySelector<HTMLButtonElement>('button'))
  act(() => button.click())
  assertEquals(button.getAttribute('aria-expanded'), 'true')

  act(() => renderDOM(null, container))
})

// --- hidden vs. unmount: why it matters ------------------------------------------------------

Deno.test('Disclosure (preact): a stateful child keeps state across close→open', () => {
  const { container, unmount } = mountVNode(
    element({ trigger: 'Q', children: h('input', { defaultValue: 'hello' }), defaultOpen: true }),
  )
  const button = must(container.querySelector<HTMLButtonElement>('button'))
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.value = 'edited by the user'
  })

  act(() => button.click()) // close
  act(() => button.click()) // reopen

  assertEquals(container.querySelector('input'), input)
  assertEquals(input.value, 'edited by the user')

  unmount()
})
