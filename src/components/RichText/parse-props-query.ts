/**
 * Parses a querystring-shaped string (`"id=foo&style[color]=red&items[0][label]=Home"`) into a
 * nested object — the same authoring convention legacy content already uses inside a `<props>`
 * tag or a markdown link/image URL's own `_props` param — both `props-sentinel.ts`'s `<props>` tag
 * handler and `markdown.ts`'s own URL-`_props` extraction call this same parser, so the two authoring
 * surfaces share one implementation instead of each parsing querystrings on its own. Built on the
 * native `URLSearchParams`, not a third-party querystring library —
 * legacy's own `queryParams` did the same, and the bracket-nesting/coercion behavior below is a
 * deliberately adequate reimplementation of that same convention, not a byte-for-byte port of an
 * implementation this package doesn't have in front of it.
 *
 * Bracket segments build nested objects; a segment that's a bare non-negative integer (`[0]`,
 * `[12]`) builds an array index instead — `items[0][label]=Home&items[1][label]=About` produces
 * `{ items: [{ label: 'Home' }, { label: 'About' }] }`. A scalar value coerces `'true'`/`'false'`
 * to real booleans and a numeric-looking string to a real `number`; anything else stays a string.
 *
 * Deliberately NOT a general-purpose querystring library: no repeated-bare-key-becomes-array
 * behavior (bracket indices are the one supported array syntax), no percent-encoding edge cases
 * beyond what `URLSearchParams` itself already handles. Adequate for `<props>`'s own real authoring
 * need, not a replacement for `URLSearchParams` itself.
 */
export function parsePropsQuery(query: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const params = new URLSearchParams(query)

  for (const [rawKey, rawValue] of params) {
    const path = splitBracketPath(rawKey)
    assignAtPath(result, path, coerceScalar(rawValue))
  }

  return result
}

/** `"items[0][label]"` → `['items', '0', 'label']`; `"id"` → `['id']`. */
function splitBracketPath(key: string): string[] {
  const [head, ...rest] = key.split('[')
  const segments = [head]
  for (const part of rest) {
    segments.push(part.replace(/\]$/, ''))
  }
  return segments.filter((segment) => segment.length > 0)
}

function isArrayIndex(segment: string): boolean {
  return /^\d+$/.test(segment)
}

function assignAtPath(target: Record<string, unknown>, path: string[], value: unknown): void {
  let cursor: Record<string, unknown> | unknown[] = target

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]
    const isLast = i === path.length - 1
    const nextSegment = path[i + 1]

    if (isLast) {
      ;(cursor as Record<string, unknown>)[segment] = value
      return
    }

    const existing = (cursor as Record<string, unknown>)[segment]
    const shouldBeArray = nextSegment !== undefined && isArrayIndex(nextSegment)
    const container = existing ?? (shouldBeArray ? [] : {})
    ;(cursor as Record<string, unknown>)[segment] = container
    cursor = container as Record<string, unknown> | unknown[]
  }
}

function coerceScalar(value: string): string | number | boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value)
  return value
}
