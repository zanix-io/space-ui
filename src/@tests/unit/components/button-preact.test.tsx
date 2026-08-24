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
  // renderer's own real output instead of assuming they're identical. Checked as a prefix, not the
  // full opening tag, so this doesn't assume `disabled` is the last attribute before `>` — it isn't
  // (see `data-space-ui`, added after it in render.ts's own object literal).
  assertStringIncludes(html, '<button type="button" disabled')
  assertStringIncludes(html, '>Save</button>')
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

Deno.test('Button (preact): aria-expanded/aria-controls reach the real DOM verbatim', () => {
  const html = render(
    Button({
      onClick: () => {},
      'aria-expanded': true,
      'aria-controls': 'panel-1',
      children: 'Toggle',
    }),
  )

  assertStringIncludes(html, 'aria-expanded="true"')
  assertStringIncludes(html, 'aria-controls="panel-1"')
})

Deno.test('Button (preact): aria-expanded={false} renders "false", never omitted', () => {
  const html = render(
    Button({ onClick: () => {}, 'aria-expanded': false, children: 'Toggle' }),
  )

  assertStringIncludes(html, 'aria-expanded="false"')
})

Deno.test('Button (preact): without aria-expanded/aria-controls, neither is rendered', () => {
  const html = render(Button({ onClick: () => {}, children: 'Save' }))

  assertEquals(html.includes('aria-expanded'), false)
  assertEquals(html.includes('aria-controls'), false)
})

Deno.test('Button (preact): aria-current reaches the real DOM verbatim', () => {
  const html = render(Button({ onClick: () => {}, 'aria-current': 'step', children: '2' }))

  assertStringIncludes(html, 'aria-current="step"')
})

Deno.test('Button (preact): aria-current={true} renders the literal "true" string', () => {
  const html = render(Button({ onClick: () => {}, 'aria-current': true, children: '1' }))

  assertStringIncludes(html, 'aria-current="true"')
})

Deno.test('Button (preact): without aria-current, no such attribute is rendered', () => {
  const html = render(Button({ onClick: () => {}, children: '1' }))

  assertEquals(html.includes('aria-current'), false)
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

Deno.test('Button (preact): tabIndex reaches the real DOM verbatim', () => {
  const html = render(Button({ tabIndex: -1, children: 'Item' }))

  assertStringIncludes(html, 'tabindex="-1"')
})

Deno.test('Button (preact): without tabIndex, no such attribute is rendered', () => {
  const html = render(Button({ children: 'Item' }))

  assertEquals(html.includes('tabindex'), false)
})

Deno.test('Button (preact): id reaches the real DOM verbatim', () => {
  const html = render(Button({ id: 'tab-general', children: 'General' }))

  assertStringIncludes(html, 'id="tab-general"')
})
