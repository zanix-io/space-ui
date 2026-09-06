import { createElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createImgButton } from './render.ts'
import type { ImgButtonBaseProps } from './types.ts'

export type { ImgButtonBaseProps } from './types.ts'

/** {@linkcode ImgButtonBaseProps} plus `visual`. Written out explicitly (rather than a direct
 * alias to `ImgButtonRenderProps<ReactNode>`) so this package's public API surface never names an
 * unexported type, the same `deno doc --lint` constraint `Menu`'s own `MenuProps` doc already
 * documents. */
export type ImgButtonProps = ImgButtonBaseProps & {
  /** Render-prop slot for a caller-owned decorative visual — an already-built `ReactElement` (the
   * caller's own `Image` instance, a plain `<img>`, anything), never a data shape this component
   * resolves itself. Wins over the {@linkcode ImgButtonBaseProps.image} convenience shorthand when
   * both are given. See `render.ts`'s own `ImgButtonRenderProps.visual` doc for the full reasoning
   * and the exact `icon`/`visual`/`image` precedence. */
  visual?: () => ReactNode
}

/**
 * A composition of `Button`/`Link` + `Icon`/`Image` — an icon, a caller-supplied visual, or the
 * `image` convenience shorthand, an optional caption, and one interactive control around them.
 * `href` present composes `Link` (navigation); absent composes `Button` (an action) — never a
 * single always-`<a>` shape. See {@linkcode ImgButtonProps}'s own doc for the full contract, and
 * `render.ts`'s own doc for exactly how `Icon`/`visual`/`Image` are composed and why the accessible
 * name lives only on the interactive element.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * ## Comet-safe with `image` composed, by construction
 *
 * This component composes `Image`'s own `render.ts` (`createImage`) for its
 * {@linkcode ImgButtonBaseProps.image} convenience prop — but calls it with NO resolver injected,
 * the same comet-safe root-barrel binding `components/Image/index.ts` itself exports (see that
 * file's own doc, and `Image/render.ts`'s own module doc for the full two-binding shape). This is
 * safe only because `Image/render.ts` no longer has a hardcoded `@zanix/space` import as of this
 * change — a static ES import is unconditionally hoisted regardless of runtime branching, so an
 * earlier version of this component composing `Image` directly WOULD have reached `@zanix/space`'s
 * own `resolveAssetHref` for every instance, which made every `ImgButton` instance unusable inside
 * a `'use comet'` file (`@zanix/space`'s own `comet-plugin.ts` fails a build if any such file's
 * module graph reaches a module flagged `'server-only'`, and `assets-manifest` is one) — the
 * original reason `visual` (see {@linkcode ImgButtonProps.visual}'s own doc) was added, and still a
 * fully supported, real render-prop today, independent of this. That's what lets `ImgButton` live
 * in the root barrel (`.`/`./preact`) instead of `./runtime`/`./runtime/preact` — confirmed by a
 * real, permanent structural guard (`src/@tests/unit/intl/dependency-boundary.test.ts`) asserting
 * this component's own module never reaches `@zanix/space`, at compile time or runtime.
 *
 * @example
 * ```tsx
 * <ImgButton href="/cart" label="View cart" icon={{ href: '/sprite.svg', name: 'cart', viewBox: '0 0 24 24' }} />
 * <ImgButton onClick={() => save()} label="Save" icon={{ href: '/sprite.svg', name: 'save', viewBox: '0 0 24 24' }} />
 * <ImgButton href="/product/42" label="View product" image={{ src: 'https://cdn.example.com/product-42.jpg' }} />
 * ```
 */
// Same kind of widening cast `Menu/index.ts`'s own doc explains — `createImgButton`'s shared body
// types `visual` as `() => E` (here, `() => ReactElement`), while this component's own public
// `ImgButtonProps.visual` is deliberately the wider `() => ReactNode` (so a caller can return a
// string/`null`/fragment, not just a single `ReactElement`). The cast is this widening, nothing
// more: every real call site still only ever hands `visual()`'s result straight to `h` as children,
// which accepts the full `ReactNode` range regardless of this binding's own internal type
// parameter. Also covers the same overload-set mismatch `Icon/index.ts`'s own cast documents.
export const ImgButton: (props: ImgButtonProps) => ReactElement = createImgButton(
  createElement as unknown as CreateElement<ReactElement>,
) as (props: ImgButtonProps) => ReactElement
