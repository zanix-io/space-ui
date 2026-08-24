# Third-party notice — default icon catalog

`catalog.svg` in this directory is a curated, modified subset of **Font Awesome Free 7.3.1**
(https://fontawesome.com), by Fonticons, Inc. It is **not** a runtime dependency of
`@zanix/space-ui` — see `docs/icons.md` for how `CatalogIcon` consumes it. This file exists so
provenance stays auditable no matter how this asset is later distributed (scaffolded into a
generated project, copied by hand, etc.).

## Source

- **Package:** `@fortawesome/fontawesome-free`
- **Version:** `7.3.1`
- **Style:** `svgs/solid/` only — every icon in this catalog is the Solid weight
- **Retrieved:** icons downloaded directly from the official npm distribution
  (`unpkg.com/@fortawesome/fontawesome-free@7.3.1/svgs/solid/*.svg`), not from any Zanix legacy
  asset — this catalog carries its own license/attribution artifact from the source above, so it has
  no dependency on any prior sprite this package may have shipped

## License

- **Icons (SVG):** CC BY 4.0 (Creative Commons Attribution 4.0 International) — full text in
  `LICENSES/fontawesome-free-7.3.1.txt`, copied verbatim from the official package, unmodified.
- CC BY 4.0 permits extraction of a subset, modification, and redistribution — including inside a
  generated project — provided attribution is given and changes are indicated (both done below).
- Font Awesome's own fonts (SIL OFL 1.1) are **not used** here — this catalog only ever consumes the
  individual SVG files, never the icon font.

## What was curated (the change being indicated, per CC BY 4.0 §3)

- **17 icons selected**, all from the `solid` style. Zero brand/social icons — Font Awesome's own
  license file carries a separate restriction for those ("do not use brand logos for any purpose
  except to represent the company, product, or service to which they refer"), and this catalog never
  touches that question because it doesn't include any.
- Each source file's own `<path fill="currentColor" d="...">` was extracted byte-for-byte (no
  hand-retyped path data) and wrapped as a `<symbol id="{name}">`, assembled into one sprite file.
  No path geometry was altered by this step or by the optimization step below.
- **Shipped here readable, not pre-minified** — formatted with this package's own `deno fmt`
  (`--ext svg` is one of Deno's supported formatter targets), the same tool every other file here is
  formatted with; a future contributor adding/editing a symbol just runs `deno fmt`, same as for any
  other file, no special-cased exception to remember. Minification is a **build-time** concern for
  whichever project scaffolds this file, not something baked in here — see `@zanix/space-ui`'s own
  `docs/icons.md` ("SVG optimization") for exactly how and why.
- `svgo@^3`'s `cleanupIds` transform, left unguided, strips every `<symbol id>` down to none if run
  against a multi-symbol sprite like this one — see `docs/icons.md` ("SVG optimization") for how a
  build step should configure `svgo` to preserve them.
- **10 of the 17 have prior usage** in Zanix's own component libraries; the other **7 are
  additions** to round out the default set.
- **The public name of one icon differs from its upstream file name**: `search` is sourced from Font
  Awesome's `magnifying-glass.svg` — Zanix's own chosen vocabulary, not inherited verbatim from the
  provider, so a future source swap never has to rename this icon's public id.
- Each symbol keeps its own real `viewBox` — NOT normalized to a single shared value (7 of the 17
  use a narrower box than `0 0 512 512`; see `CATALOG_VIEWBOX` in `@zanix/space-ui`'s own
  `src/components/CatalogIcon/types.ts`).
- Every path kept its original `fill="currentColor"` — no color was hardcoded, so the catalog tints
  via ordinary CSS `color` inheritance, the same mechanism any theme (default, dark, custom, or
  none) already relies on.

## Attribution

Font Awesome's own `LICENSES/fontawesome-free-7.3.1.txt` states: _"Downloaded Font Awesome Free
files already contain embedded comments with sufficient attribution."_ Rather than duplicate that
comment 17 times (one per symbol), this sprite carries **one combined attribution comment** at the
top of `catalog.svg`, copied verbatim from the source files:

```
<!--! Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2026 Fonticons, Inc. -->
```

Do not remove this comment when copying/regenerating this file — see Font Awesome's own request in
their license ("we ask that you do not actively work to remove them from files").

## The 17 icons in this catalog

`spinner`, `close`, `gear`, `phone`, `envelope`, `arrow-up`, `arrow-down`, `arrow-left`,
`arrow-right`, `map-location-dot`, `search`, `check`, `plus`, `minus`, `triangle-exclamation`,
`circle-info`, `circle-check` — this list, `CatalogIconName` (`@zanix/space-ui`'s
`src/components/CatalogIcon/types.ts`), `CATALOG_VIEWBOX`, and the `<symbol id="...">` set inside
`catalog.svg` are meant to always agree exactly; `space-ui`'s own test suite checks this (see
`catalog-integrity.test.ts`).

## Relationship to `theme/` — this is `shared/`, deliberately not `theme/`

`catalog.svg` lives under `src/templates/shared/icons/`, the same namespace as
`src/templates/shared/behavior.css` — never under `src/templates/theme/`. This is a structural
guarantee, not just a naming choice: the catalog is the same physical file regardless of which
visual theme (the current default, a future dark theme, a corporate/custom one, or no theme at all)
a project uses. A theme only ever controls _presentation_ — the `color` a symbol's
`fill="currentColor"` inherits, the `size` passed to `Icon`/`CatalogIcon` — never whether the sprite
exists or what it contains. `CatalogIcon` and this asset are not coupled to any scaffold preset;
activating/consuming the icon catalog and activating a visual theme remain two independent decisions
— headless without the catalog, headless with it, themed with it, themed without it, or the catalog
under a custom theme are all valid combinations.

## Updating

Re-curating (a version bump of the upstream package, adding/removing an icon) is a deliberate act:
re-run the same extraction against the new upstream version, update this file's own version/date,
and update `LICENSES/` if the license text itself changed. Never a silent transitive dependency bump
— this file is committed, not fetched live.
