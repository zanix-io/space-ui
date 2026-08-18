import { assertEquals, assertThrows } from '@std/assert'
import { h } from 'preact'
import { render } from 'preact-render-to-string'
import { parse } from '@formatjs/icu-messageformat-parser'
import { IntlProvider, useIntl } from 'intl/index.preact.ts'

// Called via `h(...)` + `render(...)`, not as a plain function — `useIntl()`/`useContext` need a
// real Preact render pass to resolve context, unlike a stateless component like `Button` (see that
// component's own preact test for why those can be invoked as plain functions instead).

function Title() {
  const { formatMessage } = useIntl()
  return h('h1', null, formatMessage('home/title'))
}

Deno.test('IntlProvider/useIntl (preact): a descendant formats a plain message', () => {
  const html = render(
    h(IntlProvider, { locale: 'en', messages: { 'home/title': 'Welcome' } }, h(Title, null)),
  )
  assertEquals(html, '<h1>Welcome</h1>')
})

Deno.test(
  'IntlProvider/useIntl (preact): formats a precompiled AST value the same as its source string',
  () => {
    function Cart() {
      const { formatMessage } = useIntl()
      return h('p', null, formatMessage('cart', { count: 3 }))
    }
    const compiled = parse('{count, plural, one {# item} other {# items}}')

    const html = render(
      h(IntlProvider, { locale: 'en', messages: { cart: compiled } }, h(Cart, null)),
    )
    assertEquals(html, '<p>3 items</p>')
  },
)

Deno.test('IntlProvider (preact): a single catalog mixes string and precompiled-AST values', () => {
  function Both() {
    const { formatMessage } = useIntl()
    return h(
      'p',
      null,
      `${formatMessage('greet', { name: 'Ada' })}/${formatMessage('cart', { count: 1 })}`,
    )
  }
  const html = render(
    h(
      IntlProvider,
      {
        locale: 'en',
        messages: {
          greet: 'Hi, {name}!',
          cart: parse('{count, plural, one {# item} other {# items}}'),
        },
      },
      h(Both, null),
    ),
  )
  assertEquals(html, '<p>Hi, Ada!/1 item</p>')
})

Deno.test('useIntl (preact): throws when called outside an IntlProvider', () => {
  function Orphan() {
    useIntl()
    return null
  }
  assertThrows(() => render(h(Orphan, null)), Error, 'IntlProvider')
})
