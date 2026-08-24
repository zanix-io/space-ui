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
 *
 * SEO/security: `JSON.stringify` never escapes `/`, so a `data` value containing the literal text
 * `</script>` (a real, plausible field for the schemas this component is actually used for —
 * `Review.reviewBody`, `Product.description`, anything sourced from user content) would otherwise
 * close this element's own `<script>` tag early: everything after it stops being JSON-LD and starts
 * being parsed as real page markup, up to and including a following `<script>...</script>` pair
 * actually EXECUTING. {@linkcode escapeJsonLd} closes that off by escaping every `<` in the
 * serialized JSON to its `<` form — valid inside a JSON string, and `JSON.parse`-round-trips
 * back to the original character, so nothing about the DATA changes, only its safety as inline
 * `<script>` content.
 */
export function createStructuredData<E>(
  h: CreateElement<E>,
): <T extends Thing>(props: StructuredDataProps<T>) => E {
  return function StructuredData<T extends Thing>(
    { data }: StructuredDataProps<T>,
  ): E {
    return h('script', {
      type: 'application/ld+json',
      dangerouslySetInnerHTML: { __html: escapeJsonLd(resolveStructuredData(data)) },
    })
  }
}

/** See {@linkcode createStructuredData}'s own doc for why this escaping is necessary — exported
 * standalone for the same reason {@linkcode resolveStructuredData} is: a consumer injecting JSON-LD
 * into raw HTML outside of this component (or of React/Preact) still needs the same protection. */
export function escapeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
