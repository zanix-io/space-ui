import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from 'components/Button/index.ts'

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
