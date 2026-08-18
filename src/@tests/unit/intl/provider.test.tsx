import { assertEquals, assertThrows } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { parse } from '@formatjs/icu-messageformat-parser'
import { IntlProvider, useIntl } from 'intl/index.ts'

function Title() {
  const { formatMessage } = useIntl()
  return <h1>{formatMessage('home/title')}</h1>
}

Deno.test('IntlProvider/useIntl (react): a descendant formats a plain message', () => {
  const html = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{ 'home/title': 'Welcome' }}>
      <Title />
    </IntlProvider>,
  )
  assertEquals(html, '<h1>Welcome</h1>')
})

Deno.test(
  'IntlProvider/useIntl (react): formats a precompiled AST value the same as its source string',
  () => {
    function Cart() {
      const { formatMessage } = useIntl()
      return <p>{formatMessage('cart', { count: 3 })}</p>
    }
    const compiled = parse('{count, plural, one {# item} other {# items}}')

    const html = renderToStaticMarkup(
      <IntlProvider locale='en' messages={{ cart: compiled }}>
        <Cart />
      </IntlProvider>,
    )
    assertEquals(html, '<p>3 items</p>')
  },
)

Deno.test('IntlProvider (react): a single catalog mixes string and precompiled-AST values', () => {
  function Both() {
    const { formatMessage } = useIntl()
    return (
      <p>
        {formatMessage('greet', { name: 'Ada' })}/{formatMessage('cart', { count: 1 })}
      </p>
    )
  }
  const html = renderToStaticMarkup(
    <IntlProvider
      locale='en'
      messages={{
        greet: 'Hi, {name}!',
        cart: parse('{count, plural, one {# item} other {# items}}'),
      }}
    >
      <Both />
    </IntlProvider>,
  )
  assertEquals(html, '<p>Hi, Ada!/1 item</p>')
})

Deno.test('useIntl (react): throws when called outside an IntlProvider', () => {
  function Orphan() {
    useIntl()
    return null
  }
  assertThrows(() => renderToStaticMarkup(<Orphan />), Error, 'IntlProvider')
})
