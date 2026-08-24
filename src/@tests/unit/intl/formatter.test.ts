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

// --- formatRichText ---------------------------------------------------------------------------
// `RichText`'s own foundation — see `formatter.ts`'s own doc on `formatRichText` for the full
// contract (the `createIntl<unknown>` widening this depends on, the tags/values merge, why the
// return shape below is real `@formatjs/intl` behavior, not narrowed here).

type FakeNode = { tag: string; children: Array<string | FakeNode> }

function fakeTag(tag: string) {
  return (chunks: Array<string | FakeNode>): FakeNode => ({ tag, children: chunks })
}

Deno.test('createFormatter: formatRichText — a message with no tags returns a plain string', () => {
  const { formatRichText } = createFormatter('en', { plain: 'just text, no tags' })
  const result = formatRichText('plain', { b: fakeTag('b') })
  assertEquals(result, 'just text, no tags')
})

Deno.test(
  'createFormatter: formatRichText — tags given but unused still returns a plain string',
  () => {
    const { formatRichText } = createFormatter('en', { plain: 'no tags used here' })
    const result = formatRichText('plain', { b: fakeTag('b'), i: fakeTag('i') })
    assertEquals(result, 'no tags used here')
  },
)

Deno.test(
  'createFormatter: formatRichText — a message that is entirely one tag returns that tag’s T directly',
  () => {
    const { formatRichText } = createFormatter('en', { bold: '<b>hello</b>' })
    const result = formatRichText('bold', { b: fakeTag('b') })
    assertEquals(result, { tag: 'b', children: ['hello'] })
  },
)

Deno.test(
  'createFormatter: formatRichText — text mixed with a tag returns Array<string | T>, in order',
  () => {
    const { formatRichText } = createFormatter('en', { mixed: 'before <b>middle</b> after' })
    const result = formatRichText('mixed', { b: fakeTag('b') })
    assertEquals(result, ['before ', { tag: 'b', children: ['middle'] }, ' after'])
  },
)

Deno.test('createFormatter: formatRichText — nested tags nest the same way', () => {
  const { formatRichText } = createFormatter('en', { nested: '<b>bold <i>and italic</i></b>' })
  const result = formatRichText('nested', { b: fakeTag('b'), i: fakeTag('i') })
  assertEquals(result, { tag: 'b', children: ['bold ', { tag: 'i', children: ['and italic'] }] })
})

Deno.test('createFormatter: formatRichText — ICU interpolation values work alongside tags', () => {
  const { formatRichText } = createFormatter('en', { greet: 'Hello <b>{name}</b>!' })
  const result = formatRichText('greet', { b: fakeTag('b') }, { name: 'Ada' })
  assertEquals(result, ['Hello ', { tag: 'b', children: ['Ada'] }, '!'])
})

Deno.test('createFormatter: formatRichText — a tag wins over a same-named value', () => {
  const { formatRichText } = createFormatter('en', { collide: '<b>x</b>' })
  const result = formatRichText('collide', { b: fakeTag('b') }, { b: 'not a tag' })
  assertEquals(result, { tag: 'b', children: ['x'] })
})
