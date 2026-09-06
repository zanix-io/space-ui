import { createElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createCard } from './render.ts'
import type { CardBaseProps } from './types.ts'

export type { CardBaseProps } from './types.ts'

/** {@linkcode CardBaseProps} plus `visual`. Written out explicitly (rather than a direct alias to
 * `CardRenderProps<ReactNode>`) so this package's public API surface never names an unexported
 * type, the same `deno doc --lint` constraint `Menu`'s own `MenuProps` doc already documents. */
export type CardProps = CardBaseProps & {
  /** Render-prop slot for a caller-owned decorative visual — an already-built `ReactElement` (the
   * caller's own `Image` instance, a plain `<img>`, anything), never a data shape this component
   * resolves itself. Wins over the {@linkcode CardBaseProps.image} convenience shorthand when both
   * are given. See `render.ts`'s own `CardRenderProps.visual` doc for the full reasoning. */
  visual?: () => ReactNode
}

/**
 * A title/subtitle/content/footer/visual composition built entirely on `Grid`, `Link`, and (for
 * the `image` convenience prop) the comet-safe root-barrel `Image` — no duplicated layout or
 * link-rendering logic. The stacked (mobile) vs. side-by-side (desktop, ≥721px) layout is resolved
 * entirely by CSS (`src/templates/shared/card.css`, optional) — this component runs no viewport
 * detection, ships with no JavaScript fallback for it, and is fully valid, correctly ordered
 * markup with or without that CSS loaded. See {@linkcode CardProps}'s own doc for the full
 * contract, and `render.ts`'s own doc for exactly how the responsive layout is expressed.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * ## Comet-safe with `image` composed, by construction
 *
 * This component composes `Image`'s own `render.ts` (`createImage`) for its
 * {@linkcode CardBaseProps.image} convenience prop — but calls it with NO resolver injected, the
 * same comet-safe root-barrel binding `components/Image/index.ts` itself exports (see that file's
 * own doc, and `Image/render.ts`'s own module doc for the full two-binding shape). This is safe
 * only because `Image/render.ts` no longer has a hardcoded `@zanix/space` import as of this change
 * — a static ES import is unconditionally hoisted regardless of runtime branching, so an earlier
 * version of this component composing `Image` directly WOULD have reached `@zanix/space`'s own
 * `resolveAssetHref` for every instance, which made every `Card` instance unusable inside a `'use
 * comet'` file (`@zanix/space`'s own `comet-plugin.ts` fails a build if any such file's module
 * graph reaches a module flagged `'server-only'`, and `assets-manifest` is one) — the original
 * reason `visual` (see {@linkcode CardProps.visual}'s own doc) was added, and still a fully
 * supported, real render-prop today, independent of this. That's what lets `Card` live in the root
 * barrel (`.`/`./preact`) instead of `./runtime`/`./runtime/preact` — confirmed by a real,
 * permanent structural guard (`src/@tests/unit/intl/dependency-boundary.test.ts`) asserting this
 * component's own module never reaches `@zanix/space`, at compile time or runtime.
 *
 * @example
 * ```tsx
 * <Card
 *   title="A mountain retreat"
 *   content="Description of the property goes here."
 *   image={{ src: 'https://cdn.example.com/cabin.jpg' }}
 *   align="left"
 *   footer={[{ href: '/listings/cabin', children: 'View listing' }]}
 * />
 * <Card
 *   title="A mountain retreat"
 *   content="Description of the property goes here."
 *   visual={() => <Image src='https://cdn.example.com/cabin.jpg' alt='A cabin in the mountains' />}
 *   align="left"
 * />
 * ```
 */
// Same kind of widening cast `Menu/index.ts`'s own doc explains — `createCard`'s shared body types
// `visual` as `() => E` (here, `() => ReactElement`), while this component's own public
// `CardProps.visual` is deliberately the wider `() => ReactNode` (so a caller can return a
// string/`null`/fragment, not just a single `ReactElement`). The cast is this widening, nothing
// more: every real call site still only ever hands `visual()`'s result straight to `h` as children,
// which accepts the full `ReactNode` range regardless of this binding's own internal type
// parameter. Also covers the same overload-set mismatch `Icon/index.ts`'s own cast documents.
export const Card: (props: CardProps) => ReactElement = createCard(
  createElement as unknown as CreateElement<ReactElement>,
) as (props: CardProps) => ReactElement
