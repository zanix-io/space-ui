/**
 * `@zanix/space-ui`'s components with a REAL runtime dependency on `@zanix/space` — split out into
 * their own entrypoint entirely, never re-exported from the default (`.`) barrel. Each of these six
 * resolves `@zanix/space`'s own `resolveAssetHref` (from `@zanix/space/assets-manifest`), either
 * directly or by composing another component that does:
 *
 * - `Video` resolves it directly (`Video/render.ts`).
 * - `Image` resolves it directly (`Image/render.ts`).
 * - `RichText` resolves it directly too (`RichText/resolve.ts`, used by `resolveRichTextDocument`
 *   below), AND composes both `Image` and `Video` internally for its own built-in tags
 *   (`RichText/tags.ts`, `RichText/markdown.ts`).
 * - `ImgButton` composes `Image` (`ImgButton/render.ts`).
 * - `Card` composes `Image` (`Card/render.ts`).
 * - `Menu` composes `Image` directly AND composes `ImgButton` — itself an `Image` composer
 *   (`Menu/render.ts`).
 *
 * Why a separate entrypoint, not just a documented exception inside `mod.ts`: a barrel export
 * forces resolution of every module it re-exports together, so keeping these six inside `mod.ts`/
 * `mod-preact.ts` would force resolution of all six the moment a consumer imports even ONE
 * unrelated component from there (e.g. `Button`, which has zero `@zanix/space` dependency) —
 * pulling `@zanix/space` back into the graph. Since `@zanix/space`'s OWN build pipeline is what
 * resolves a `@zanix/space-ui` import when building a `@zanix/space` app that uses this package,
 * that produces a genuine circular resolution: `@zanix/space`'s own build tooling ending up needing
 * to resolve `@zanix/space` itself, one repo away. Confirmed to hang `@deno/loader`'s native
 * workspace resolution in a real `zanix space build` (an isolated minimal repro — a synthetic
 * `@zanix/space` app importing only `Button`/`Modal` from `@zanix/space-ui`'s bare root — hung
 * identically; a control build with zero `@zanix/space-ui` usage completed in ~15s).
 *
 * Splitting these six into their own entrypoint means `.`/`./preact` never reach `@zanix/space` at
 * all (see `src/@tests/unit/intl/dependency-boundary.test.ts`'s own structural guard for this),
 * while THIS entrypoint requires `@zanix/space` to actually be resolvable — exactly the trade a
 * consumer who actually uses one of these six components already has to accept.
 *
 * Any FUTURE component whose own real reachable graph — direct or via composing another component —
 * touches `@zanix/space` (or any other real cross-package runtime dependency) belongs here too,
 * never in the root (`.`) barrel.
 *
 * @module
 */

export { Video } from 'components/Video/index.ts'
export type { VideoProps, VideoSourceProps, VideoTrackProps } from 'components/Video/types.ts'

export { Image } from 'components/Image/index.ts'
export type { ImageProps, ImageSourceProps } from 'components/Image/types.ts'

export { RichText } from 'components/RichText/index.ts'
export type { RichTextProps } from 'components/RichText/index.ts'
export type { RichTextBaseProps, RichTextContentFormat } from 'components/RichText/types.ts'
export { resolveRichTextDocument } from 'components/RichText/resolve.ts'
export type { ResolveRichTextDocumentOptions } from 'components/RichText/resolve.ts'
// The one piece of `RichText`'s own internals exported standalone — the sanctioned way a custom
// tag passed through `RichText`'s own `tags` prop participates in population the same uniform way
// every built-in tag does. Renderer-agnostic (no `h`/`createElement` involved), same export in
// both entrypoints.
export { extractRichTextProps } from 'components/RichText/props-sentinel.ts'

export { ImgButton } from 'components/ImgButton/index.ts'
export type { ImgButtonProps } from 'components/ImgButton/types.ts'

export { Card } from 'components/Card/index.ts'
export type { CardImageProps, CardProps } from 'components/Card/types.ts'

export { Menu } from 'components/Menu/index.ts'
export type { MenuItem, MenuOpenMode, MenuProps } from 'components/Menu/types.ts'
