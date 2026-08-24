import { assertEquals } from '@std/assert'
import { parsePropsQuery } from 'components/RichText/parse-props-query.ts'

Deno.test('parsePropsQuery: a single flat key-value pair', () => {
  assertEquals(parsePropsQuery('id=foo'), { id: 'foo' })
})

Deno.test('parsePropsQuery: multiple flat pairs', () => {
  assertEquals(parsePropsQuery('id=foo&className=bar'), { id: 'foo', className: 'bar' })
})

Deno.test('parsePropsQuery: coerces "true"/"false" to real booleans', () => {
  assertEquals(parsePropsQuery('disabled=true&visible=false'), { disabled: true, visible: false })
})

Deno.test('parsePropsQuery: coerces a numeric-looking value to a real number', () => {
  assertEquals(parsePropsQuery('tabIndex=0&offset=8&ratio=1.5'), {
    tabIndex: 0,
    offset: 8,
    ratio: 1.5,
  })
})

Deno.test('parsePropsQuery: a negative number still coerces', () => {
  assertEquals(parsePropsQuery('offset=-8'), { offset: -8 })
})

Deno.test('parsePropsQuery: a non-numeric, non-boolean value stays a string', () => {
  assertEquals(parsePropsQuery('label=Home'), { label: 'Home' })
})

Deno.test('parsePropsQuery: a value that merely looks partially numeric stays a string', () => {
  assertEquals(parsePropsQuery('version=1.2.3'), { version: '1.2.3' })
})

Deno.test('parsePropsQuery: an empty value stays an empty string, not 0', () => {
  assertEquals(parsePropsQuery('label='), { label: '' })
})

Deno.test('parsePropsQuery: one level of bracket nesting builds a nested object', () => {
  assertEquals(parsePropsQuery('style[color]=red'), { style: { color: 'red' } })
})

Deno.test('parsePropsQuery: multiple keys under the same bracket nest into one object', () => {
  assertEquals(parsePropsQuery('style[color]=red&style[fontSize]=12'), {
    style: { color: 'red', fontSize: 12 },
  })
})

Deno.test('parsePropsQuery: a bare numeric bracket segment builds an array index', () => {
  assertEquals(parsePropsQuery('tags[0]=a&tags[1]=b'), { tags: ['a', 'b'] })
})

Deno.test('parsePropsQuery: array of objects via nested bracket indices', () => {
  const result = parsePropsQuery('items[0][label]=Home&items[0][url]=/&items[1][label]=About')
  assertEquals(result, {
    items: [{ label: 'Home', url: '/' }, { label: 'About' }],
  })
})

Deno.test('parsePropsQuery: percent-encoded values decode via URLSearchParams', () => {
  assertEquals(parsePropsQuery('label=Hello%20World'), { label: 'Hello World' })
})

Deno.test('parsePropsQuery: an empty string input yields an empty object', () => {
  assertEquals(parsePropsQuery(''), {})
})

Deno.test('parsePropsQuery: a value containing a literal $ is not truncated', () => {
  // The exact class of legacy bug this redesign fixes — see `RichText`'s own CHANGELOG entry:
  // legacy's `{{($...$)}}` string-marker regex broke on any value containing `$`. This module
  // never re-parses a stringified marker at all, so there's no delimiter for `$` to collide with.
  assertEquals(parsePropsQuery('label=Price%3A%20%245'), { label: 'Price: $5' })
})
