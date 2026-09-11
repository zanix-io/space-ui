import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Chip } from 'components/Chip/index.ts'

function mount(element: ReturnType<typeof Chip>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    unmount: () => act(() => root.unmount()),
  }
}

// --- static variant --------------------------------------------------------------------------

Deno.test('Chip: static (no onRemove) — no button rendered at all', () => {
  const html = renderToStaticMarkup(<Chip label='Vegetarian' />)
  assertStringIncludes(html, 'data-space-ui="chip"')
  assertStringIncludes(html, 'Vegetarian')
  assertEquals(html.includes('<button'), false)
})

Deno.test('Chip: default tone is neutral', () => {
  const html = renderToStaticMarkup(<Chip label='Vegetarian' />)
  assertStringIncludes(html, 'data-tone="neutral"')
})

Deno.test('Chip: tone is a plain, open passthrough — any string is accepted verbatim', () => {
  const html = renderToStaticMarkup(<Chip label='Board games' tone='primary' />)
  assertStringIncludes(html, 'data-tone="primary"')
})

// --- removable variant -------------------------------------------------------------------------

Deno.test('Chip: removable (onRemove given) — a real button, default "Remove {label}" label', () => {
  const html = renderToStaticMarkup(<Chip label='Board games' onRemove={() => {}} />)
  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'type="button"')
  assertStringIncludes(html, 'aria-label="Remove Board games"')
})

Deno.test('Chip: removeLabel overrides the default English string', () => {
  const html = renderToStaticMarkup(
    <Chip label='Board games' onRemove={() => {}} removeLabel='Quitar' />,
  )
  assertStringIncludes(html, 'aria-label="Quitar"')
})

Deno.test('Chip: clicking remove calls onRemove exactly once', () => {
  let calls = 0
  const { container, unmount } = mount(<Chip label='Board games' onRemove={() => calls++} />)
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(calls, 1)
  unmount()
})

Deno.test('Chip: id/className land on the root element', () => {
  const html = renderToStaticMarkup(<Chip label='Board games' id='chip-1' className='big' />)
  assertStringIncludes(html, 'id="chip-1"')
  assertStringIncludes(html, 'class="big"')
})
