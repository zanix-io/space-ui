import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { Button } from 'components/Button/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.

Deno.test('Button (preact): renders a real <button> with type="button" by default', () => {
  const html = render(Button({ onClick: () => {}, children: 'Open menu' }))

  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'type="button"')
  assertStringIncludes(html, '>Open menu</button>')
})

Deno.test('Button (preact): type is overridable to submit/reset', () => {
  const html = render(Button({ type: 'submit', children: 'Save' }))

  assertStringIncludes(html, 'type="submit"')
})

Deno.test('Button (preact): an icon-only button gets its name from an explicit label', () => {
  const html = render(Button({ onClick: () => {}, label: 'Close dialog', children: '×' }))

  assertStringIncludes(html, 'aria-label="Close dialog"')
})

Deno.test('Button (preact): disabled is forwarded as a real HTML attribute', () => {
  const html = render(Button({ disabled: true, children: 'Save' }))

  // preact-render-to-string serializes boolean attributes as the bare name (`disabled`), unlike
  // React's `renderToStaticMarkup` (`disabled=""`) — both are valid HTML, this just matches each
  // renderer's own real output instead of assuming they're identical.
  assertStringIncludes(html, '<button type="button" disabled>')
})

Deno.test(
  'Button (preact): a role="switch" is forwarded with the aria-checked its own spec requires',
  () => {
    const html = render(
      Button({ onClick: () => {}, role: 'switch', checked: true, children: 'Toggle' }),
    )

    assertStringIncludes(html, 'role="switch"')
    assertStringIncludes(html, 'aria-checked="true"')
  },
)

Deno.test(
  'Button (preact): a role="tab" is forwarded with the aria-selected its own spec requires',
  () => {
    const html = render(
      Button({ onClick: () => {}, role: 'tab', selected: false, children: 'Overview' }),
    )

    assertStringIncludes(html, 'role="tab"')
    assertStringIncludes(html, 'aria-selected="false"')
  },
)

Deno.test('Button (preact): without a role override, no role attribute is rendered', () => {
  const html = render(Button({ onClick: () => {}, children: 'Open menu' }))

  assertEquals(html.includes('role='), false)
})

Deno.test(
  'Button (preact): name/value identify which submit button was pressed in a multi-action form',
  () => {
    const html = render(
      Button({ type: 'submit', name: 'action', value: 'archive', children: 'Archive' }),
    )

    assertStringIncludes(html, 'name="action"')
    assertStringIncludes(html, 'value="archive"')
  },
)
