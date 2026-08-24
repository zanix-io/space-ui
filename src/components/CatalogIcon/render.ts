import type { CreateElement } from 'typings/renderer.ts'
import { createIcon } from '../Icon/render.ts'
import type { IconCatalogProps } from './types.ts'

/**
 * Builds a `CatalogIcon`-shaped component bound to any name→viewBox map — a thin resolver over
 * the unmodified `Icon`, never a second icon system: turns `name` into the matching `viewBox` from
 * `viewBoxByName` and delegates the actual render to `Icon` untouched — same markup, same
 * `data-space-ui="icon"` hook, same decorative/labeled accessibility behavior, nothing duplicated
 * here. Fully static once bound — a plain object property lookup; no `Map`, no `fetch`, no dynamic
 * imports, no I/O of any kind. `href` stays the caller's own concern, exactly like `Icon` already
 * requires — this file never knows or assumes where any sprite is served from.
 *
 * This package's own `CatalogIcon` (the default export) is exactly `createCatalogIcon(h,
 * CATALOG_VIEWBOX)`, bound once per renderer in `index.ts`/`index.preact.ts` — see those files.
 * Nothing about this function is specific to that particular 17-icon set: `viewBoxByName` is a
 * plain parameter, so any consumer can bind their OWN name→viewBox map the exact same way.
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
): (props: IconCatalogProps<Name>) => E {
  const Icon = createIcon(h)

  return function CatalogIcon(props: IconCatalogProps<Name>): E {
    const { name, ...rest } = props
    return Icon({ ...rest, name, viewBox: viewBoxByName[name] })
  }
}
