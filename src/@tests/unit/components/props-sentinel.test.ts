import { assertEquals } from '@std/assert'
import {
  createRichTextPropsSentinel,
  extractRichTextProps,
} from 'components/RichText/props-sentinel.ts'

// --- extraction / passthrough ---------------------------------------------------------------

Deno.test('extractRichTextProps: no sentinels — every chunk passes through as a child', () => {
  const result = extractRichTextProps(['hello ', 'world'])
  assertEquals(result.props, {})
  assertEquals(result.children, ['hello ', 'world'])
})

Deno.test('extractRichTextProps: a single sentinel is removed and its props extracted', () => {
  const chunks = ['before', createRichTextPropsSentinel('id=foo'), 'after']
  const result = extractRichTextProps(chunks)
  assertEquals(result.props, { id: 'foo' })
  assertEquals(result.children, ['before', 'after'])
})

Deno.test('extractRichTextProps: preserves document order among the remaining children', () => {
  const chunks = ['a', createRichTextPropsSentinel('x=1'), 'b', 'c']
  const result = extractRichTextProps(chunks)
  assertEquals(result.children, ['a', 'b', 'c'])
})

Deno.test('extractRichTextProps: never mistakes a plain object chunk for a sentinel', () => {
  // The exact bug class this whole mechanism exists to make structurally impossible: a real,
  // ordinary chunk value (e.g. a nested renderer node standing in for one here) that merely LOOKS
  // like it could carry props must never be treated as population metadata.
  const lookalike = { props: { id: 'not-really-a-marker' } }
  const result = extractRichTextProps(['x', lookalike, 'y'])
  assertEquals(result.props, {})
  assertEquals(result.children, ['x', lookalike, 'y'])
})

// --- merge semantics: className concatenates -------------------------------------------------

Deno.test('extractRichTextProps: a single className passes through unchanged', () => {
  const result = extractRichTextProps([createRichTextPropsSentinel('className=one')])
  assertEquals(result.props.className, 'one')
})

Deno.test('extractRichTextProps: two className values concatenate, space-joined, in order', () => {
  const chunks = [
    createRichTextPropsSentinel('className=one'),
    createRichTextPropsSentinel('className=two'),
  ]
  const result = extractRichTextProps(chunks)
  assertEquals(result.props.className, 'one two')
})

Deno.test('extractRichTextProps: three className values all concatenate, in order', () => {
  const chunks = [
    createRichTextPropsSentinel('className=one'),
    createRichTextPropsSentinel('className=two'),
    createRichTextPropsSentinel('className=three'),
  ]
  const result = extractRichTextProps(chunks)
  assertEquals(result.props.className, 'one two three')
})

// --- merge semantics: style shallow-merges -----------------------------------------------------

Deno.test('extractRichTextProps: a single style object passes through unchanged', () => {
  const result = extractRichTextProps([createRichTextPropsSentinel('style[color]=red')])
  assertEquals(result.props.style, { color: 'red' })
})

Deno.test('extractRichTextProps: two style blocks shallow-merge, later keys win per-key', () => {
  const chunks = [
    createRichTextPropsSentinel('style[color]=red&style[fontSize]=12'),
    createRichTextPropsSentinel('style[color]=blue'),
  ]
  const result = extractRichTextProps(chunks)
  // `color` from the second block wins; `fontSize` from the first survives — a real shallow
  // merge, not one block's whole `style` object replacing the other's.
  assertEquals(result.props.style, { color: 'blue', fontSize: 12 })
})

// --- merge semantics: everything else is last-write-wins ---------------------------------------

Deno.test('extractRichTextProps: a non-className/style scalar is last-write-wins', () => {
  const chunks = [
    createRichTextPropsSentinel('id=first'),
    createRichTextPropsSentinel('id=second'),
  ]
  const result = extractRichTextProps(chunks)
  assertEquals(result.props.id, 'second')
})

Deno.test('extractRichTextProps: unrelated keys across blocks all survive together', () => {
  const chunks = [
    createRichTextPropsSentinel('id=foo'),
    createRichTextPropsSentinel('disabled=true'),
  ]
  const result = extractRichTextProps(chunks)
  assertEquals(result.props, { id: 'foo', disabled: true })
})

Deno.test('extractRichTextProps: className/style merge combines with last-write-wins keys', () => {
  const chunks = [
    createRichTextPropsSentinel('className=one&style[color]=red&id=first'),
    createRichTextPropsSentinel('className=two&style[fontSize]=12&id=second'),
  ]
  const result = extractRichTextProps(chunks)
  assertEquals(result.props, {
    className: 'one two',
    style: { color: 'red', fontSize: 12 },
    id: 'second',
  })
})

// --- real content values, not just markers ----------------------------------------------------

Deno.test('extractRichTextProps: a value containing a literal $ merges correctly', () => {
  // The concrete legacy bug (a `$` breaking the old string-marker regex) is structurally
  // impossible here — there is no marker string to break, `<props>` parses immediately.
  const chunks = [createRichTextPropsSentinel('label=Price%3A%20%245')]
  const result = extractRichTextProps(chunks)
  assertEquals(result.props.label, 'Price: $5')
})

Deno.test('extractRichTextProps: no sentinel at all — plain text is never swallowed', () => {
  // The other confirmed legacy bug: for "component-type" tags, plain text with no `<props>`
  // marker was silently discarded and misparsed as querystring. Here, ordinary text with no
  // sentinel present is always just a normal child — never touched.
  const result = extractRichTextProps(['Click me'])
  assertEquals(result.props, {})
  assertEquals(result.children, ['Click me'])
})
