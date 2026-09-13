import type { CreateElement } from 'typings/renderer.ts'
import { createIcon } from '../Icon/render.ts'
import type { IconCatalogProps } from './types.ts'

/**
 * Builds a `CatalogIcon`-shaped component bound to any name→viewBox map — a thin resolver over
 * the unmodified `Icon`, never a second icon system: turns `name` into the matching `viewBox` from
 * `viewBoxByName` and delegates the actual render to `Icon` untouched — same markup, same
 * `data-space-ui="icon"` hook, same decorative/labeled accessibility behavior, nothing duplicated
 * here. Fully static once bound — a plain object property lookup; no `Map`, no `fetch`, no dynamic
 * imports, no I/O of any kind by default.
 *
 * `resolveHref` is an OPTIONAL, injected function — same shape `Image/render.ts`'s own
 * `createImage(h, resolveHref?)` already establishes for an identical need. When given, it resolves
 * a local `href` (the sprite file path, before this function appends `#{name}` — see `Icon/
 * render.ts`'s own `<use href="{href}#{name}">`) to its real, possibly content-hashed build URL; an
 * already-absolute URL passes through untouched either way. When omitted, a relative `href` passes
 * through UNRESOLVED — a predictable, documented degradation, never a throw. This is what makes TWO
 * real bindings possible from this exact same shared factory:
 * - `index.ts`/`index.preact.ts` (this package's own default `CatalogIcon`, `.`/`./preact`) call
 *   `createCatalogIcon(h, CATALOG_VIEWBOX)` with NO resolver — comet-safe (zero `@zanix/space`
 *   reachability), correct for an already-absolute `href` (the common case for a Comet author
 *   today), but a relative local sprite path is left exactly as given.
 * - `src/runtime/catalog-icon.ts`/`.preact.ts` (`./runtime/catalog-icon`) inject `@zanix/space/
 *   assets-manifest`'s own `resolveAssetHref` — auto-resolving, SSR-only, `@zanix/space`-dependent
 *   by design, the same "two bindings, same name, additive" shape `Image`'s own module doc
 *   documents for its identical split.
 *
 * Nothing about this function is specific to that particular 17-icon set: `viewBoxByName` is a
 * plain parameter, so any consumer can bind their OWN name→viewBox map the exact same way — and
 * `resolveHref` is equally available to a consumer's own custom catalog, not special-cased to this
 * package's default one.
 *
 * **When to reach for this directly, instead of `CatalogIcon`:** whenever your project has its own
 * curated sprite (a design system's icon set, a different vendor's, a subset of this package's own
 * catalog plus project-specific additions) and you want the same compile-time-checked-`name` +
 * no-`viewBox`-at-the-call-site ergonomics `CatalogIcon` gives this package's own set, applied to
 * *your* set instead. One call, once per renderer, is the entire cost — no build step, no codegen:
 *
 * ```ts
 * // my-icon.ts — a project's own equivalent of this package's `CatalogIcon`
 * import { createElement } from 'react'
 * import type { ReactElement } from 'react'
 * import { createCatalogIcon } from 'jsr:@zanix/space-ui@[version]'
 * import type { CreateElement } from 'jsr:@zanix/space-ui@[version]'
 *
 * const MY_ICON_VIEWBOX = {
 *   logo: '0 0 32 32',
 *   'chevron-down': '0 0 16 16',
 * } as const
 *
 * export type MyIconName = keyof typeof MY_ICON_VIEWBOX
 *
 * // `React.createElement`'s per-tag-overloaded type doesn't structurally match `CreateElement<E>`
 * // (see `Icon/index.ts`'s own comment on this exact cast) — safe here for the same reason: this
 * // factory only ever calls `h` with a plain string tag and a plain props object.
 * export const MyIcon: (props: { name: MyIconName; href: string }) => ReactElement =
 *   createCatalogIcon(createElement as unknown as CreateElement<ReactElement>, MY_ICON_VIEWBOX)
 * ```
 *
 * If you only ever need ONE icon rendered with an explicit `viewBox` you already know, reach for
 * the plain `Icon` export instead — `createCatalogIcon` earns its keep specifically when you have a
 * *map* of names to look up, the same problem this package's own `CatalogIcon` solves for its
 * curated set.
 *
 * Exported publicly (unlike `Icon`'s own `createIcon`, which stays internal): `Icon` has nothing
 * left to parametrize by data — every prop, `viewBox` included, is already the caller's to pass
 * directly. `createCatalogIcon` exists precisely because a *map* is worth binding once instead of
 * repeating a lookup at every call site, and that value applies equally to a consumer's own map.
 */
export function createCatalogIcon<E, Name extends string>(
  h: CreateElement<E>,
  viewBoxByName: Record<Name, string>,
  resolveHref?: (href: string) => string,
): (props: IconCatalogProps<Name>) => E {
  const Icon = createIcon(h)
  const resolveFileHref = createResolveFileHref(resolveHref)

  return function CatalogIcon(props: IconCatalogProps<Name>): E {
    const { name, href, ...rest } = props
    return Icon({ ...rest, name, href: resolveFileHref(href), viewBox: viewBoxByName[name] })
  }
}

/** Builds this component's own `resolveFileHref`, closing over whichever `resolveHref` (if any)
 * `createCatalogIcon` was given — deliberately duplicated from `Image/render.ts`'s own identical
 * `createResolveFileSrc` (not imported from a shared module) — this package's `render.ts` files are
 * independently reviewable/movable by design; a ~10-line function used at two call sites doesn't
 * justify a new shared-helpers precedent. */
function createResolveFileHref(resolveHref?: (href: string) => string): (href: string) => string {
  return function resolveFileHref(href: string): string {
    try {
      new URL(href)
      return href
    } catch {
      return resolveHref ? resolveHref(href) : href
    }
  }
}
