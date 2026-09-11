/**
 * Derives a 1–2 character initials string from a display name — pure, standalone, directly
 * unit-tested, same "extract the arithmetic, test it exhaustively" discipline
 * `get-pagination-items.ts`/`detect-social-network.ts` already establish for this package, applied
 * here to name parsing instead. Never exported publicly (an internal implementation detail of
 * `Avatar`'s own fallback, the same visibility `get-pagination-items.ts` itself has for
 * `Pagination`).
 *
 * Splits on whitespace, takes the first character of the FIRST and LAST word (uppercased) when two
 * or more words are present (`'Ada Lovelace'` → `'AL'`); a single word takes its own first two
 * characters instead (`'Prince'` → `'PR'`); an empty/whitespace-only name yields `''` — `Avatar`
 * itself decides what a caller-visible empty fallback looks like, not this function.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
