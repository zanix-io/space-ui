import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { SocialLinksInput } from 'components/SocialLinksInput/index.preact.ts'
import type {
  SocialLinkEntry,
  SocialLinksInputProps,
} from 'components/SocialLinksInput/index.preact.ts'

// Unlike every hookless Preact component in this package, `SocialLinksInput` uses real hooks —
// built with `h(SocialLinksInput, props)` and rendered through Preact's own pipeline, same
// reasoning `input-preact.test.tsx`/`combobox-preact.test.tsx` already establish.

function typeInto(input: HTMLInputElement, text: string) {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function element(props: SocialLinksInputProps): VNode {
  return h(SocialLinksInput, props) as VNode
}

function mount(props: SocialLinksInputProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: SocialLinksInputProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function seedEntry(url = ''): SocialLinkEntry {
  return { id: 'seed-1', url, network: null }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('SocialLinksInput (preact): SSR — root hook, one row per entry, an "+" control', () => {
  const html = renderToString(element({ defaultValues: [seedEntry('https://x.com/zanix')] }))

  assertStringIncludes(html, 'data-space-ui="social-links-input"')
  assertStringIncludes(html, 'data-space-ui="input"')
  assertStringIncludes(html, 'value="https://x.com/zanix"')
  assertStringIncludes(html, 'aria-label="Add another social link"')
})

Deno.test('SocialLinksInput (preact): with no entries, only the "+" control renders', () => {
  const html = renderToString(element({}))
  assertEquals(html.includes('type="url"'), false)
  assertStringIncludes(html, 'aria-label="Add another social link"')
})

// --- real DOM: adding a row -----------------------------------------------------------------

Deno.test('SocialLinksInput (preact): "+" appends one empty row and focuses its own input', () => {
  const { container, unmount } = mount({})
  const addButton = must(
    container.querySelector<HTMLButtonElement>('[aria-label="Add another social link"]'),
  )

  act(() => addButton.click())

  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="url"]')
  assertEquals(inputs.length, 1)
  assertEquals(document.activeElement, inputs[0])

  unmount()
})

Deno.test('SocialLinksInput (preact): "+" clicked twice appends two independent rows', () => {
  const { container, unmount } = mount({})
  function addButton() {
    return must(
      container.querySelector<HTMLButtonElement>('[aria-label="Add another social link"]'),
    )
  }

  act(() => addButton().click())
  act(() => addButton().click())

  assertEquals(container.querySelectorAll('input[type="url"]').length, 2)

  unmount()
})

Deno.test('SocialLinksInput (preact): max disables the "+" button once reached', () => {
  const { container, unmount } = mount({ defaultValues: [seedEntry()], max: 1 })
  const addButton = must(
    container.querySelector<HTMLButtonElement>('[aria-label="Add another social link"]'),
  )

  assertEquals(addButton.disabled, true)

  unmount()
})

// --- real DOM: typing + network auto-detection --------------------------------------------

Deno.test('SocialLinksInput (preact): typing a URL re-detects the network on every change', () => {
  const snapshots: SocialLinkEntry[][] = []
  const { container, unmount } = mount({
    defaultValues: [seedEntry()],
    onValuesChange: (values) => snapshots.push(values),
  })
  const input = must(container.querySelector<HTMLInputElement>('input[type="url"]'))

  act(() => typeInto(input, 'https://instagram.com/zanix'))

  const last = must(snapshots.at(-1))
  assertEquals(last[0].url, 'https://instagram.com/zanix')
  assertEquals(last[0].network, 'instagram')

  unmount()
})

// --- real DOM: removing a row ---------------------------------------------------------------

Deno.test("SocialLinksInput (preact): the remove button's accessible name includes the row's own URL", () => {
  const html = renderToString(element({ defaultValues: [seedEntry('https://x.com/zanix')] }))
  assertStringIncludes(html, 'aria-label="Remove https://x.com/zanix"')
})

Deno.test('SocialLinksInput (preact): an empty row\'s remove button falls back to "this link"', () => {
  const html = renderToString(element({ defaultValues: [seedEntry()] }))
  assertStringIncludes(html, 'aria-label="Remove this link"')
})

Deno.test('SocialLinksInput (preact): clicking remove drops exactly that entry', () => {
  const entries: SocialLinkEntry[] = [
    seedEntry('https://x.com/zanix'),
    { id: 'seed-2', url: 'https://instagram.com/zanix', network: null },
  ]
  const snapshots: SocialLinkEntry[][] = []
  const { container, unmount } = mount({
    defaultValues: entries,
    onValuesChange: (v) => snapshots.push(v),
  })

  const removeButtons = container.querySelectorAll<HTMLButtonElement>('[aria-label^="Remove"]')
  assertEquals(removeButtons.length, 2)
  act(() => removeButtons[0].click())

  const last = must(snapshots.at(-1))
  assertEquals(last.length, 1)
  assertEquals(last[0].id, 'seed-2')

  unmount()
})

// --- real DOM: controlled vs. uncontrolled --------------------------------------------------

Deno.test('SocialLinksInput (preact): controlled values never self-mutate without a prop update', () => {
  const snapshots: SocialLinkEntry[][] = []
  const values = [seedEntry('fixed')]
  const { container, unmount } = mount({ values, onValuesChange: (v) => snapshots.push(v) })
  const input = must(container.querySelector<HTMLInputElement>('input[type="url"]'))

  act(() => typeInto(input, 'changed'))

  assertEquals(must(snapshots.at(-1))[0].url, 'changed')
  assertEquals(input.value, 'fixed')

  unmount()
})

// --- form integration: name suffixing -------------------------------------------------------

Deno.test('SocialLinksInput (preact): name suffixes each row with its own index', () => {
  const entries: SocialLinkEntry[] = [
    seedEntry('a'),
    { id: 'seed-2', url: 'b', network: null },
  ]
  const { container, unmount } = mount({ defaultValues: entries, name: 'socialLinks' })
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="url"]')

  assertEquals(inputs[0].name, 'socialLinks_0')
  assertEquals(inputs[1].name, 'socialLinks_1')

  unmount()
})

Deno.test('SocialLinksInput (preact): with no name given, no row carries a name attribute', () => {
  const html = renderToString(element({ defaultValues: [seedEntry('a')] }))
  assertEquals(html.includes('name='), false)
})

// --- renderIcon render-prop -------------------------------------------------------------------

Deno.test('SocialLinksInput (preact): renderIcon renders inside an aria-hidden wrapper', () => {
  const html = renderToString(
    element({
      defaultValues: [seedEntry('https://instagram.com/zanix')],
      renderIcon: (entry) => h('span', { 'data-testid': 'icon' }, entry.network),
    }),
  )
  assertStringIncludes(html, 'aria-hidden="true"')
  assertStringIncludes(html, 'data-testid="icon"')
  assertStringIncludes(html, 'instagram')
})

Deno.test('SocialLinksInput (preact): a defaultValues entry seeded with network: null still detects on first render, before any edit', () => {
  // `seedEntry` always seeds `network: null`, the same shape a caller loading known URLs (e.g. a
  // saved profile) reasonably supplies with no detection pass of its own. Asserts the exact icon
  // span content, not merely that "instagram" appears somewhere in the markup — the URL's own
  // `value="..."` attribute contains that substring regardless of what `entry.network` resolves to.
  const html = renderToString(
    element({
      defaultValues: [seedEntry('https://instagram.com/zanix')],
      renderIcon: (entry) => h('span', { 'data-testid': 'icon' }, entry.network ?? 'generic'),
    }),
  )
  assertStringIncludes(html, '<span data-testid="icon">instagram</span>')
})
