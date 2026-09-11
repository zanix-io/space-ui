import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { SocialLinksInput } from 'components/SocialLinksInput/index.ts'
import type { SocialLinkEntry } from 'components/SocialLinksInput/index.ts'

// Same real-value-tracker-bypassing technique `input.test.tsx` already establishes — needed
// because React installs a "value tracker" on native inputs to distinguish a real user edit from
// a programmatic `.value =` assignment.
function typeInto(input: HTMLInputElement, text: string) {
  const descriptor = must(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value'))
  const nativeSetter = must(descriptor.set)
  nativeSetter.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function mount(element: ReturnType<typeof SocialLinksInput>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof SocialLinksInput>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function seedEntry(url = ''): SocialLinkEntry {
  return { id: 'seed-1', url, network: null }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('SocialLinksInput: SSR — root hook, one row per entry, an "+" control', () => {
  const html = renderToStaticMarkup(
    <SocialLinksInput defaultValues={[seedEntry('https://x.com/zanix')]} />,
  )

  assertStringIncludes(html, 'data-space-ui="social-links-input"')
  assertStringIncludes(html, 'data-space-ui="input"')
  assertStringIncludes(html, 'value="https://x.com/zanix"')
  assertStringIncludes(html, 'aria-label="Add another social link"')
})

Deno.test('SocialLinksInput: addButtonLabel overrides the default "+" accessible name', () => {
  const html = renderToStaticMarkup(<SocialLinksInput addButtonLabel='Add link' />)
  assertStringIncludes(html, 'aria-label="Add link"')
})

Deno.test('SocialLinksInput: with no entries, only the "+" control renders', () => {
  const html = renderToStaticMarkup(<SocialLinksInput />)
  assertEquals(html.includes('type="url"'), false)
  assertStringIncludes(html, 'aria-label="Add another social link"')
})

// --- real DOM: adding a row -----------------------------------------------------------------

Deno.test('SocialLinksInput: "+" appends one empty row and focuses its own input', () => {
  const { container, unmount } = mount(<SocialLinksInput />)
  const addButton = must(
    container.querySelector<HTMLButtonElement>('[aria-label="Add another social link"]'),
  )

  act(() => addButton.click())

  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="url"]')
  assertEquals(inputs.length, 1)
  assertEquals(document.activeElement, inputs[0])

  unmount()
})

Deno.test('SocialLinksInput: "+" clicked twice appends two independent rows', () => {
  const { container, unmount } = mount(<SocialLinksInput />)
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

Deno.test('SocialLinksInput: max caps the total entries — the "+" button disables once reached', () => {
  const { container, unmount } = mount(
    <SocialLinksInput defaultValues={[seedEntry()]} max={1} />,
  )
  const addButton = must(
    container.querySelector<HTMLButtonElement>('[aria-label="Add another social link"]'),
  )

  assertEquals(addButton.disabled, true)

  act(() => addButton.click())
  assertEquals(container.querySelectorAll('input[type="url"]').length, 1)

  unmount()
})

// --- real DOM: typing + network auto-detection --------------------------------------------

Deno.test('SocialLinksInput: typing a URL re-detects the network on every change', () => {
  const snapshots: SocialLinkEntry[][] = []
  const { container, unmount } = mount(
    <SocialLinksInput
      defaultValues={[seedEntry()]}
      onValuesChange={(values) => snapshots.push(values)}
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input[type="url"]'))

  act(() => typeInto(input, 'https://instagram.com/zanix'))

  const last = must(snapshots.at(-1))
  assertEquals(last[0].url, 'https://instagram.com/zanix')
  assertEquals(last[0].network, 'instagram')

  unmount()
})

Deno.test('SocialLinksInput: an unrecognized but parseable URL detects as "website"', () => {
  const snapshots: SocialLinkEntry[][] = []
  const { container, unmount } = mount(
    <SocialLinksInput
      defaultValues={[seedEntry()]}
      onValuesChange={(values) => snapshots.push(values)}
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input[type="url"]'))

  act(() => typeInto(input, 'https://example.com'))

  assertEquals(must(snapshots.at(-1))[0].network, 'website')

  unmount()
})

// --- real DOM: removing a row ---------------------------------------------------------------

Deno.test("SocialLinksInput: the remove button's accessible name includes the row's own URL", () => {
  const html = renderToStaticMarkup(
    <SocialLinksInput defaultValues={[seedEntry('https://x.com/zanix')]} />,
  )
  assertStringIncludes(html, 'aria-label="Remove https://x.com/zanix"')
})

Deno.test('SocialLinksInput: an empty row\'s remove button falls back to "this link"', () => {
  const html = renderToStaticMarkup(<SocialLinksInput defaultValues={[seedEntry()]} />)
  assertStringIncludes(html, 'aria-label="Remove this link"')
})

Deno.test('SocialLinksInput: clicking remove drops exactly that entry', () => {
  const entries = [
    seedEntry('https://x.com/zanix'),
    { id: 'seed-2', url: 'https://instagram.com/zanix', network: null } as SocialLinkEntry,
  ]
  const snapshots: SocialLinkEntry[][] = []
  const { container, unmount } = mount(
    <SocialLinksInput defaultValues={entries} onValuesChange={(v) => snapshots.push(v)} />,
  )

  const removeButtons = container.querySelectorAll<HTMLButtonElement>(
    '[aria-label^="Remove"]',
  )
  assertEquals(removeButtons.length, 2)
  act(() => removeButtons[0].click())

  const last = must(snapshots.at(-1))
  assertEquals(last.length, 1)
  assertEquals(last[0].id, 'seed-2')

  unmount()
})

// --- real DOM: controlled vs. uncontrolled --------------------------------------------------

Deno.test('SocialLinksInput: controlled values never self-mutate without a prop update', () => {
  const snapshots: SocialLinkEntry[][] = []
  const values = [seedEntry('fixed')]
  const { container, unmount } = mount(
    <SocialLinksInput values={values} onValuesChange={(v) => snapshots.push(v)} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input[type="url"]'))

  act(() => typeInto(input, 'changed'))

  assertEquals(must(snapshots.at(-1))[0].url, 'changed')
  assertEquals(input.value, 'fixed')

  unmount()
})

// --- form integration: name suffixing -------------------------------------------------------

Deno.test('SocialLinksInput: name suffixes each row with its own index', () => {
  const entries = [seedEntry('a'), { id: 'seed-2', url: 'b', network: null } as SocialLinkEntry]
  const { container, unmount } = mount(
    <SocialLinksInput defaultValues={entries} name='socialLinks' />,
  )
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="url"]')

  assertEquals(inputs[0].name, 'socialLinks_0')
  assertEquals(inputs[1].name, 'socialLinks_1')

  unmount()
})

Deno.test('SocialLinksInput: with no name given, no row carries a name attribute', () => {
  const html = renderToStaticMarkup(<SocialLinksInput defaultValues={[seedEntry('a')]} />)
  assertEquals(html.includes('name='), false)
})

// --- renderIcon render-prop -------------------------------------------------------------------

Deno.test('SocialLinksInput: renderIcon renders inside an aria-hidden wrapper', () => {
  const html = renderToStaticMarkup(
    <SocialLinksInput
      defaultValues={[seedEntry('https://instagram.com/zanix')]}
      renderIcon={(entry) => <span data-testid='icon'>{entry.network}</span>}
    />,
  )
  assertStringIncludes(html, 'aria-hidden="true"')
  assertStringIncludes(html, 'data-testid="icon"')
  assertStringIncludes(html, 'instagram')
})

Deno.test('SocialLinksInput: a defaultValues entry seeded with network: null still detects on first render, before any edit', () => {
  // `seedEntry` always seeds `network: null`, the same shape a caller loading known URLs (e.g. a
  // saved profile) reasonably supplies with no detection pass of its own. Asserts the exact icon
  // span content, not merely that "instagram" appears somewhere in the markup — the URL's own
  // `value="..."` attribute contains that substring regardless of what `entry.network` resolves to.
  const html = renderToStaticMarkup(
    <SocialLinksInput
      defaultValues={[seedEntry('https://instagram.com/zanix')]}
      renderIcon={(entry) => <span data-testid='icon'>{entry.network ?? 'generic'}</span>}
    />,
  )
  assertStringIncludes(html, '<span data-testid="icon">instagram</span>')
})

Deno.test('SocialLinksInput: with no renderIcon, no decorative <span> icon wrapper renders', () => {
  // The remove/"+" buttons' own inline SVGs already carry `aria-hidden` (decorative icons inside
  // an already-labeled button, same convention `Modal`'s own close button uses) — this asserts the
  // absence of the SEPARATE `<span aria-hidden>` wrapper `renderIcon`'s own result would get, not
  // the absence of `aria-hidden` anywhere on the page.
  const html = renderToStaticMarkup(<SocialLinksInput defaultValues={[seedEntry('a')]} />)
  assertEquals(html.includes('<span aria-hidden'), false)
})

// --- className / id passthrough ---------------------------------------------------------------

Deno.test('SocialLinksInput: id/className forward onto the root element', () => {
  const html = renderToStaticMarkup(
    <SocialLinksInput id='links' className='ui-social-links' defaultValues={[seedEntry('a')]} />,
  )
  assertStringIncludes(html, 'id="links"')
  assertStringIncludes(html, 'class="ui-social-links"')
})
