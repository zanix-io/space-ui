import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { Thing } from 'schema-dts'
import type { CreateElement } from 'typings/renderer.ts'
import { createStructuredData } from './render.ts'
import type { StructuredDataProps } from './types.ts'

/**
 * A JSON-LD `<script type="application/ld+json">` tag from typed structured data
 * ([schema.org](https://schema.org) vocabulary, via `schema-dts`'s own types). `data` is rendered
 * exactly as given — this component never formats content or resolves a logo URL. `@context`
 * defaults to `'https://schema.org'` when `data` doesn't already set it; an explicit `@context` is
 * never overridden, even a non-default one.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <StructuredData<Organization> data={{ '@type': 'Organization', name: 'Zanix' }} />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const StructuredData: <T extends Thing>(
  props: StructuredDataProps<T>,
) => ReactElement = createStructuredData(
  createElement as unknown as CreateElement<ReactElement>,
)
