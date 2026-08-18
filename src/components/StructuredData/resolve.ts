import type { Thing, WithContext } from 'schema-dts'
import type { StructuredDataProps } from './types.ts'

/**
 * The pure computation behind `StructuredData` — fills in a MISSING `@context` (defaulting to
 * `'https://schema.org'`), never touches an explicit one (even a non-default value), and never
 * mutates `data` itself. Exported standalone, independent of any renderer, for a consumer that
 * wants the final JSON-LD object without going through the component at all — e.g. injecting it
 * into a raw HTML template outside React/Preact entirely. `StructuredData`'s own React/Preact
 * bindings call this too; there is only ever one implementation of this logic.
 *
 * @example
 * ```ts
 * const payload = resolveStructuredData<Organization>({ '@type': 'Organization', name: 'Zanix' })
 * // { '@context': 'https://schema.org', '@type': 'Organization', name: 'Zanix' }
 * ```
 */
export function resolveStructuredData<T extends Thing>(
  data: StructuredDataProps<T>['data'],
): WithContext<T> {
  // `Thing` itself permits a bare string-IRI reference in general (schema-dts lets any NESTED
  // property reference another Thing by id) — but `data` here is always the TOP-LEVEL entry being
  // resolved, which is always a real object; the cast reflects that real, narrower guarantee, not
  // a workaround for a case that can actually occur.
  const record = data as unknown as Record<string, unknown>
  if ('@context' in record) return data as WithContext<T>

  return { '@context': 'https://schema.org', ...record } as WithContext<T>
}
