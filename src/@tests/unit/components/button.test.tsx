import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from 'components/Button/index.ts'
import { Field } from 'components/Field/index.ts'

Deno.test('Button: renders a real <button> with type="button" by default', () => {
  const html = renderToStaticMarkup(<Button onClick={() => {}}>Open menu</Button>)

  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'type="button"')
  assertStringIncludes(html, '>Open menu</button>')
})

Deno.test('Button: type is overridable to submit/reset', () => {
  const html = renderToStaticMarkup(<Button type='submit'>Save</Button>)

  assertStringIncludes(html, 'type="submit"')
})

Deno.test('Button: onClick is optional — a submit button works with no handler of its own', () => {
  const html = renderToStaticMarkup(<Button type='submit'>Save</Button>)

  assertStringIncludes(html, '<button')
})

Deno.test('Button: visible text children need no explicit label — none is rendered', () => {
  const html = renderToStaticMarkup(<Button onClick={() => {}}>Open menu</Button>)

  assertEquals(html.includes('aria-label'), false)
})

Deno.test('Button: an icon-only button gets its accessible name from an explicit label', () => {
  const html = renderToStaticMarkup(
    <Button onClick={() => {}} label='Close dialog'>×</Button>,
  )

  assertStringIncludes(html, 'aria-label="Close dialog"')
})

Deno.test('Button: disabled is forwarded as a real HTML attribute', () => {
  const html = renderToStaticMarkup(<Button disabled>Save</Button>)

  assertStringIncludes(html, 'disabled=""')
})

Deno.test(
  'Button: a role="switch" is forwarded together with the aria-checked its own spec requires',
  () => {
    const html = renderToStaticMarkup(
      <Button onClick={() => {}} role='switch' checked>Toggle</Button>,
    )

    assertStringIncludes(html, 'role="switch"')
    assertStringIncludes(html, 'aria-checked="true"')
  },
)

Deno.test(
  'Button: a role="tab" is forwarded together with the aria-selected its own spec requires',
  () => {
    const html = renderToStaticMarkup(
      <Button onClick={() => {}} role='tab' selected={false}>Overview</Button>,
    )

    assertStringIncludes(html, 'role="tab"')
    assertStringIncludes(html, 'aria-selected="false"')
  },
)

Deno.test('Button: role="menuitem" needs no companion state — it compiles with role alone', () => {
  const html = renderToStaticMarkup(
    <Button onClick={() => {}} role='menuitem'>Delete</Button>,
  )

  assertStringIncludes(html, 'role="menuitem"')
  assertEquals(html.includes('aria-checked'), false)
  assertEquals(html.includes('aria-selected'), false)
})

Deno.test('Button: aria-expanded/aria-controls reach the real DOM verbatim', () => {
  const html = renderToStaticMarkup(
    <Button onClick={() => {}} aria-expanded aria-controls='panel-1'>Toggle</Button>,
  )

  assertStringIncludes(html, 'aria-expanded="true"')
  assertStringIncludes(html, 'aria-controls="panel-1"')
})

Deno.test('Button: aria-expanded={false} renders the literal "false" string, never omitted', () => {
  const html = renderToStaticMarkup(
    <Button onClick={() => {}} aria-expanded={false} aria-controls='panel-1'>Toggle</Button>,
  )

  assertStringIncludes(html, 'aria-expanded="false"')
})

Deno.test('Button: without aria-expanded/aria-controls, neither attribute is rendered', () => {
  const html = renderToStaticMarkup(<Button onClick={() => {}}>Save</Button>)

  assertEquals(html.includes('aria-expanded'), false)
  assertEquals(html.includes('aria-controls'), false)
})

Deno.test('Button: aria-current reaches the real DOM verbatim', () => {
  const html = renderToStaticMarkup(<Button onClick={() => {}} aria-current='step'>2</Button>)

  assertStringIncludes(html, 'aria-current="step"')
})

Deno.test('Button: aria-current={true} renders the literal "true" string', () => {
  const html = renderToStaticMarkup(<Button onClick={() => {}} aria-current>1</Button>)

  assertStringIncludes(html, 'aria-current="true"')
})

Deno.test('Button: without aria-current, no such attribute is rendered', () => {
  const html = renderToStaticMarkup(<Button onClick={() => {}}>1</Button>)

  assertEquals(html.includes('aria-current'), false)
})

Deno.test('Button: aria-pressed reaches the real DOM verbatim', () => {
  const html = renderToStaticMarkup(<Button onClick={() => {}} aria-pressed>Bold</Button>)

  assertStringIncludes(html, 'aria-pressed="true"')
})

Deno.test('Button: aria-pressed={false} renders the literal "false" string, never omitted', () => {
  const html = renderToStaticMarkup(
    <Button onClick={() => {}} aria-pressed={false}>Bold</Button>,
  )

  assertStringIncludes(html, 'aria-pressed="false"')
})

Deno.test('Button: aria-pressed="mixed" is forwarded verbatim', () => {
  const html = renderToStaticMarkup(
    <Button onClick={() => {}} aria-pressed='mixed'>Bold</Button>,
  )

  assertStringIncludes(html, 'aria-pressed="mixed"')
})

Deno.test('Button: without aria-pressed, no such attribute is rendered', () => {
  const html = renderToStaticMarkup(<Button onClick={() => {}}>Bold</Button>)

  assertEquals(html.includes('aria-pressed'), false)
})

Deno.test(
  'Button: without a role override, no role attribute is rendered (native semantics apply)',
  () => {
    const html = renderToStaticMarkup(<Button onClick={() => {}}>Open menu</Button>)

    assertEquals(html.includes('role='), false)
  },
)

Deno.test('Button: title and className are forwarded', () => {
  const html = renderToStaticMarkup(
    <Button onClick={() => {}} title='Opens the main menu' className='ui-button'>
      Menu
    </Button>,
  )

  assertStringIncludes(html, 'title="Opens the main menu"')
  assertStringIncludes(html, 'class="ui-button"')
})

Deno.test(
  'Button: name/value identify which submit button was pressed in a multi-action form',
  () => {
    const html = renderToStaticMarkup(
      <Button type='submit' name='action' value='archive'>Archive</Button>,
    )

    assertStringIncludes(html, 'name="action"')
    assertStringIncludes(html, 'value="archive"')
  },
)

Deno.test('Button: tabIndex reaches the real DOM verbatim, for roving-tabindex widgets', () => {
  const html = renderToStaticMarkup(<Button tabIndex={-1}>Item</Button>)

  assertStringIncludes(html, 'tabindex="-1"')
})

Deno.test('Button: without tabIndex, no such attribute is rendered', () => {
  const html = renderToStaticMarkup(<Button>Item</Button>)

  assertEquals(html.includes('tabindex'), false)
})

Deno.test('Button: id reaches the real DOM verbatim, for cross-referencing from elsewhere', () => {
  const html = renderToStaticMarkup(<Button id='tab-general'>General</Button>)

  assertStringIncludes(html, 'id="tab-general"')
})

// --- aria-describedby / aria-invalid passthrough -----------------------------------------------

Deno.test('Button: aria-describedby and aria-invalid are forwarded verbatim', () => {
  const html = renderToStaticMarkup(
    <Button aria-describedby='hint error' aria-invalid>Open</Button>,
  )

  assertStringIncludes(html, 'aria-describedby="hint error"')
  assertStringIncludes(html, 'aria-invalid="true"')
})

Deno.test('Button: an explicit aria-invalid={false} renders aria-invalid="false"', () => {
  const html = renderToStaticMarkup(<Button aria-invalid={false}>Open</Button>)

  assertStringIncludes(html, 'aria-invalid="false"')
})

Deno.test('Button: without the props neither attribute is rendered', () => {
  const html = renderToStaticMarkup(<Button>Open</Button>)

  assertEquals(html.includes('aria-describedby'), false)
  assertEquals(html.includes('aria-invalid'), false)
})

Deno.test('Button: a role="checkbox" button inside Field is marked invalid and points at the error', () => {
  const html = renderToStaticMarkup(
    <Field label='Terms' error='Accept the terms'>
      {(field) => <Button {...field} role='checkbox' checked={false}>I accept</Button>}
    </Field>,
  )

  const button = html.match(/<button[^>]*>/)?.[0] ?? ''
  assertStringIncludes(button, 'role="checkbox"')
  assertStringIncludes(button, 'aria-invalid="true"')
  const describedBy = button.match(/aria-describedby="([^"]+)"/)?.[1] ?? ''
  assertEquals(describedBy !== '', true)
  assertStringIncludes(html, `id="${describedBy}"`)
})
