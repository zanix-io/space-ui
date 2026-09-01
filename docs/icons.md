# Default icon catalog

An optional, curated set of 17 common UI icons, available to any component/consumer through
`CatalogIcon` — a thin resolver over the unmodified `Icon`, never a second icon system. This
document covers the catalog's architecture, its license/attribution, and the `--icons` scaffold flag
(`zanix new space`/`zanix new spacecraft`) that ships it into a new project.

## `CatalogIcon`

`CatalogIcon` never changes `Icon`'s own contract — `Icon` still takes `href`/`name`/`viewBox`
exactly as before, and knows nothing about where any sprite came from. `CatalogIcon` sits alongside
it, as a separate, optional export:

```tsx
import { CatalogIcon } from 'jsr:@zanix/space-ui@[version]'

<CatalogIcon name='gear' href='/assets/icons/catalog.svg' />
```

Internally, it resolves `name` to the catalog's own `viewBox` for that icon (a plain object lookup —
no `Map`, no fetch, no I/O of any kind) and calls the real `Icon` with the result:

```
name → CATALOG_VIEWBOX[name] → { href, viewBox } → Icon
```

`href` is still yours to provide, same as `Icon` — `CatalogIcon` never resolves, imports, or assumes
a location for the sprite file itself. It renders `<use href="{href}#{name}">`, exactly `Icon`'s own
existing markup — the symbol `id` inside the catalog is the same string as the public `name`, so no
separate id-mapping step exists.

Importing `@zanix/space-ui` without ever referencing `CatalogIcon` costs nothing: no CSS, no asset,
no network call, no side effect anywhere in this package's module graph.

## `CatalogIconName`

The 17 names are a closed TypeScript union, not a bare `string` — passing an unknown name is a
compile-time error, never a silently broken `<use href="...#undefined">` at runtime:

`spinner`, `close`, `gear`, `phone`, `envelope`, `arrow-up`, `arrow-down`, `arrow-left`,
`arrow-right`, `map-location-dot`, `search`, `check`, `plus`, `minus`, `triangle-exclamation`,
`circle-info`, `circle-check`.

Ten of these have real historical usage in the legacy Zanix codebase this package descends from; the
other seven are deliberate additions, each justified individually (near-universal UI needs, or
direct support for the `shared/behavior.css` patterns already rescued — see
[`docs/styling.md`](./styling.md)). No brand/social icon is in this list — see below for why.

## Building your own catalog with `createCatalogIcon`

`CatalogIcon` (above) is just this package's own name→viewBox map, bound once through a public,
renderer-agnostic factory:

```
createCatalogIcon: (h, viewBoxByName) => (props) => E
```

`CatalogIcon` itself is exactly `createCatalogIcon(h, CATALOG_VIEWBOX)`, bound once per renderer at
`index.ts`/`index.preact.ts`. Nothing about the factory is specific to that particular 17-icon set —
`viewBoxByName` is a plain parameter, so a project with its own curated sprite (a design system's
icon set, a different vendor's, a subset of this catalog plus project-specific additions) gets the
exact same "known `name` → real `viewBox`, no lookup at the call site, unknown `name` is a compile
error" ergonomics for **its own** set:

```ts
// my-icon.ts — a project's own equivalent of this package's CatalogIcon
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { createCatalogIcon } from 'jsr:@zanix/space-ui@[version]'
import type { CreateElement } from 'jsr:@zanix/space-ui@[version]'

const MY_ICON_VIEWBOX = {
  logo: '0 0 32 32',
  'chevron-down': '0 0 16 16',
} as const

export type MyIconName = keyof typeof MY_ICON_VIEWBOX

// `React.createElement`'s per-tag-overloaded type doesn't structurally match `CreateElement<E>` —
// see `Icon/index.ts`'s own doc for why this cast is safe: the factory only ever calls `h` with a
// plain string tag and a plain props object, exactly what `createElement`'s generic overload
// accepts at runtime.
export const MyIcon: (props: { name: MyIconName; href: string }) => ReactElement =
  createCatalogIcon(createElement as unknown as CreateElement<ReactElement>, MY_ICON_VIEWBOX)
```

The same call, once more with `preact`'s `h` in place of `createElement`, gives the Preact binding —
`CatalogIcon`'s own `index.preact.ts` is the reference example.

**When to reach for this instead of the plain `Icon` export:** whenever you have a _map_ of names to
look up — a single icon rendered with a `viewBox` you already know at the call site doesn't need a
factory at all, `Icon` already covers that directly. `createCatalogIcon` earns its keep specifically
when there's a set worth binding once, the same problem this package's own `CatalogIcon` solves for
its curated 17 icons.

**When to reach for this instead of just extending `CATALOG_VIEWBOX`:** you can't —
`CATALOG_VIEWBOX` and `CatalogIconName` are this package's own closed set, not extensible from
outside (adding to them would mean forking this package). `createCatalogIcon` is the supported way
to get the same pattern over icons this package doesn't know about, without needing this package to
know about them either — your map, your names, your sprite.

Exported publicly (unlike `Icon`'s own internal `createIcon`): `Icon` has nothing left to
parametrize by data — every prop, `viewBox` included, is already the caller's to pass directly, so a
factory adds no value there. `createCatalogIcon` exists precisely because a map is worth binding
once instead of repeating a lookup at every call site, and that value applies equally to a catalog
of your own.

Same zero-cost guarantee as everything else here: a consumer who never imports `createCatalogIcon`
pays nothing for its existence — no CSS, no asset, no side effect, no network I/O in this file.

## `catalog.svg`

A single, curated SVG sprite at `src/templates/shared/icons/catalog.svg` — one `<symbol id="...">`
per `CatalogIconName`, each with its own real `viewBox` (not normalized to a shared value: 7 of the
17 use a narrower box than the most common `0 0 512 512`). ~7 KB uncompressed, ~2 KB gzip.

This file is a **template asset**, not a runtime dependency: it lives in this package's own
`src/templates/` (published as raw source on JSR, browsable/fetchable, but never part of the
`exports` map or imported by any `.ts` file here). A project receives it only through explicit
scaffolding (see "SVG optimization" below) — it never ships as part of installing `@zanix/space-ui`
as a library dependency.

## `currentColor`

Every symbol's path uses `fill="currentColor"` — never a hardcoded color. An icon's visible color
comes entirely from the CSS `color` property of the `<svg>` element or its nearest ancestor, exactly
the same mechanism any themed or unthemed project already relies on for any other
`currentColor`-based SVG. No prop, no token reference, and no code in `Icon`/`CatalogIcon`
participates in this — it's a property of the sprite file itself.

## Independence from theme

The catalog lives under `src/templates/shared/`, the same namespace as `shared/behavior.css` —
**never** `src/templates/theme/`. This is a structural fact, not a convention that could
accidentally drift: nothing inside `catalog.svg` references a `--space-*` token, a file under
`theme/`, or any specific visual identity. A theme only ever controls _presentation_ — the `color` a
symbol inherits, the `size` passed to `Icon`/`CatalogIcon` — never whether the catalog exists or
what it contains.

Concretely, all of these are valid, independent combinations: no theme + no catalog (today's
default), no theme + catalog, any theme + catalog, any theme + no catalog, a fully custom theme +
catalog. Changing or deleting a project's theme never touches `assets/icons/`, and vice versa.

## Catalog structure and license/attribution

```
src/templates/shared/icons/
├── catalog.svg
├── NOTICE.md
└── LICENSES/
    └── fontawesome-free-7.3.1.txt
```

Sourced from the official `@fortawesome/fontawesome-free` npm package, version `7.3.1`. Icons are
licensed **CC BY 4.0**; the full, unmodified license text is at
`LICENSES/fontawesome-free-7.3.1.txt`. `catalog.svg` carries the same attribution comment Font
Awesome's own individual SVG files embed ("Downloaded Font Awesome Free files already contain
embedded comments with sufficient attribution" — Font Awesome's own license text), kept once at the
top of the assembled sprite rather than duplicated per symbol. `NOTICE.md` documents the full
provenance: exact source version, what was curated (a 17-icon subset, reassembled into `<symbol>`
elements — no path geometry altered), and why the legacy `react-components` sprite (`base.svg`) was
deliberately **not** used as a source (it carried no license/attribution artifact of its own).

These three files/paths are not renamed, minimized, or moved by anything in this package's own build
or by the CLI scaffold step (`--icons`, below) — see `NOTICE.md` itself for the complete,
authoritative account.

## Why brand icons aren't in this catalog

Font Awesome's own license carries a separate restriction for brand/social marks ("do not use brand
logos for any purpose except to represent the company, product, or service to which they refer") — a
trademark concern, not just a copyright one. This catalog is scoped to generic UI glyphs only, by
design, and `SocialNetworks` already handles brand icons correctly today without bundling any of its
own: each network's icon/logo is supplied by the caller.

## SVG optimization

`catalog.svg` ships unminified and readable, formatted with this package's own `deno fmt` like every
other file in this repo; minification is left to the consuming app's own build step, not baked into
this package. If you run the sprite through `svgo` yourself — directly, or via `@zanix/space`'s
`optimize.svg` build option — be aware that `svgo`'s plain default config strips every `<symbol id>`
from a multi-symbol sprite like this one: its `cleanupIds` transform only ever analyzes one file at
a time, so it has no way to know an id such as `catalog.svg#search` is referenced from a separate
document via `<use>`. Pass the ids you need to keep to `svgo`'s own `preserve` option (in
`@zanix/space`, a bare `optimize: { svg: true }` already does this automatically for every
`<symbol id>`, while still cleaning up genuinely unused ids elsewhere in the file).

A `--icons` convenience flag for `zanix new space`/`zanix new spacecraft` scaffolds this catalog
into a new project's own `assets/icons/` and generates a pre-wired `CatalogIcon` wrapper —
implemented in `@zanix/cli` (`space-icons.ts`), fetching this package's real, published-to-JSR
template content at scaffold time.

## See also

- [`docs/styling.md`](./styling.md) — the general headless architecture (`className`,
  `data-space-ui`, `theme/` vs `shared/`) this catalog's own independence from theme builds on.
