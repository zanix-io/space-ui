import { assertEquals } from '@std/assert'
// A test-only VALUE import — `formatter.ts`/`index.ts`/`index.preact.ts` themselves only ever
// import this package as a TYPE (`MessageFormatElement`, see `formatter.ts`'s own doc, and the
// dedicated `dependency-boundary.test.ts` that verifies that empirically). This test file is
// excluded from publish (`deno.jsonc`'s own `publish.exclude`) — using the real parser here to
// build a genuine precompiled-AST fixture is more trustworthy than a hand-authored AST literal
// masquerading as one, and doesn't affect what the published package actually depends on.
import { parse } from '@formatjs/icu-messageformat-parser'
import { createFormatter } from 'intl/formatter.ts'

Deno.test('createFormatter: formats a plain message with no placeholders', () => {
  const { formatMessage } = createFormatter('en', { 'home/title': 'Welcome' })
  assertEquals(formatMessage('home/title'), 'Welcome')
})

Deno.test('createFormatter: interpolates a named value', () => {
  const { formatMessage } = createFormatter('en', { greet: 'Hello, {name}!' })
  assertEquals(formatMessage('greet', { name: 'Ada' }), 'Hello, Ada!')
})

Deno.test('createFormatter: resolves an ICU plural', () => {
  const { formatMessage } = createFormatter('en', {
    cart: '{count, plural, one {# item} other {# items}}',
  })
  assertEquals(formatMessage('cart', { count: 1 }), '1 item')
  assertEquals(formatMessage('cart', { count: 5 }), '5 items')
})

Deno.test('createFormatter: a missing id falls back to the id itself, not a throw', () => {
  const { formatMessage } = createFormatter('en', {})
  assertEquals(formatMessage('nope/not-here'), 'nope/not-here')
})

Deno.test(
  'createFormatter: a precompiled AST value formats identically to its own ICU source string',
  () => {
    const source = '{count, plural, one {# item} other {# items}}'
    const compiled = parse(source)

    const fromSource = createFormatter('en', { cart: source }).formatMessage('cart', { count: 3 })
    const fromCompiled = createFormatter('en', { cart: compiled }).formatMessage('cart', {
      count: 3,
    })

    assertEquals(fromCompiled, fromSource)
    assertEquals(fromCompiled, '3 items')
  },
)

Deno.test(
  'createFormatter: a single catalog mixes a plain-string and a precompiled-AST value — ' +
    'migrating one message at a time works',
  () => {
    const { formatMessage } = createFormatter('en', {
      'still/source': 'Hello, {name}!',
      'already/compiled': parse('{count, plural, one {# item} other {# items}}'),
    })

    assertEquals(formatMessage('still/source', { name: 'Ada' }), 'Hello, Ada!')
    assertEquals(formatMessage('already/compiled', { count: 2 }), '2 items')
  },
)
