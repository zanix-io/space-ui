import { assertEquals } from '@std/assert'
import { getInitials } from 'components/Avatar/get-initials.ts'

Deno.test('getInitials: two words — first letter of first and last word', () => {
  assertEquals(getInitials('Ada Lovelace'), 'AL')
})

Deno.test('getInitials: three or more words — first and LAST word only, middle ignored', () => {
  assertEquals(getInitials('Ada Byron Lovelace'), 'AL')
})

Deno.test('getInitials: a single word — its own first two characters', () => {
  assertEquals(getInitials('Prince'), 'PR')
})

Deno.test('getInitials: a single one-character word — that one character alone', () => {
  assertEquals(getInitials('X'), 'X')
})

Deno.test('getInitials: always uppercased, regardless of input casing', () => {
  assertEquals(getInitials('ada lovelace'), 'AL')
})

Deno.test('getInitials: collapses extra whitespace between words', () => {
  assertEquals(getInitials('  Ada   Lovelace  '), 'AL')
})

Deno.test('getInitials: empty/whitespace-only name yields an empty string', () => {
  assertEquals(getInitials(''), '')
  assertEquals(getInitials('   '), '')
})
