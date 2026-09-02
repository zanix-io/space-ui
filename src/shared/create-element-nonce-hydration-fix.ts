import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'

/**
 * React-only. Wraps `react`'s own `createElement` so every `<style nonce={...}>` element this
 * package renders (`Modal`/`Drawer`/`Toast`/`Tooltip`/`Popover`'s own functional-positioning
 * `<style>` — see `overlay-position-css.ts`'s own doc) gets `suppressHydrationWarning` for free,
 * without every `render.ts` call site (shared with Preact) having to know about it. Cast the same
 * way `Icon/index.ts` already casts raw `createElement` (see that file's own doc for why the cast
 * is safe: `React.createElement`'s per-tag-overloaded signature structurally can't match
 * {@linkcode CreateElement}'s general shape, even though every real call here only ever passes a
 * plain string tag with a plain props object) — pass
 * `createElementWithNonceHydrationFix as unknown as CreateElement<ReactElement>` to
 * `create<Component>(...)` in place of the raw `createElement` cast it replaces.
 *
 * Why this exists: a browser clears an applied `nonce` CONTENT ATTRIBUTE back to `""` immediately
 * after using it (a real, spec-defined security measure against leaking the value via
 * `getAttribute`/CSS attribute selectors — the true value survives only on the element's own
 * `.nonce` IDL property). React's hydration mismatch check reads the attribute for every element
 * EXCEPT `<script>`, which it special-cases to read `.nonce` instead — so a server-rendered
 * `<style nonce="real-value">` hydrating against a client DOM that already cleared its attribute to
 * `""` logs "A tree hydrated but some attributes of the server rendered HTML didn't match..." on
 * every single page load. Confirmed live (a real `@zanix/space` page under this package's own CSP
 * nonce default) to be cosmetic only — the real nonce still applies, the CSP still passes, the style
 * still renders — but noisy enough in the console to look like a real bug.
 *
 * Why this can't just be `suppressHydrationWarning: true` in `render.ts` directly: that prop is a
 * REACT-ONLY convention baked into `react-dom`'s reconciler — Preact's `h` has no equivalent special
 * case (`preact/src/diff/props.js` only recognizes DOM properties/attributes; an unknown prop name
 * falls through to a literal `setAttribute`), so passing it through the shared, renderer-agnostic
 * `render.ts` would leak a real `suppresshydrationwarning="true"` attribute into Preact's
 * rendered/SSR markup. Scoping the fix to this wrapper, imported ONLY by each component's own
 * React-binding `index.ts` (never `index.preact.ts`), keeps `render.ts` itself renderer-agnostic and
 * Preact's output exactly as it always was.
 */
export function createElementWithNonceHydrationFix(
  type: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): ReactElement {
  const realCreateElement = createElement as unknown as CreateElement<ReactElement>
  if (type === 'style' && props && 'nonce' in props) {
    return realCreateElement(type, { ...props, suppressHydrationWarning: true }, ...children)
  }
  return realCreateElement(type, props, ...children)
}
