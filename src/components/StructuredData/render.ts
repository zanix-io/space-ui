import type { Thing } from 'schema-dts'
import type { CreateElement } from 'typings/renderer.ts'
import { resolveStructuredData } from './resolve.ts'
import type { StructuredDataProps } from './types.ts'

/**
 * The real implementation of `StructuredData`, shared identically between the React and Preact
 * bindings — same pattern as `Icon/render.ts`. `dangerouslySetInnerHTML` is the one prop name
 * both React and Preact core recognize identically (Preact deliberately mirrors it, no
 * `preact/compat` needed), which is what makes this stay a single, renderer-agnostic
 * implementation despite emitting raw HTML. The actual `@context`-defaulting logic lives in
 * `resolve.ts`'s own `resolveStructuredData` — this function only turns its result into markup.
 */
export function createStructuredData<E>(
  h: CreateElement<E>,
): <T extends Thing>(props: StructuredDataProps<T>) => E {
  return function StructuredData<T extends Thing>(
    { data }: StructuredDataProps<T>,
  ): E {
    return h('script', {
      type: 'application/ld+json',
      dangerouslySetInnerHTML: { __html: JSON.stringify(resolveStructuredData(data)) },
    })
  }
}
