import type { Thing, WithContext } from 'schema-dts'

/** Props for {@linkcode StructuredData}. `@context` defaults to `'https://schema.org'` when
 * `data` doesn't already set it — matching the legacy component this replaces — but an explicit
 * `@context` is never overridden. Everything else in `data` is emitted exactly as given: no
 * content formatting, no logo URL resolution. */
export type StructuredDataProps<T extends Thing = Thing> = {
  data: T | WithContext<T>
}
