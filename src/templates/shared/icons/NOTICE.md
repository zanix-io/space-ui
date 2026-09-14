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

- **24 icons selected**, all from the `solid` style. Zero brand/social icons — Font Awesome's own
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
- **10 of the original 17 have prior usage** in Zanix's own component libraries; **7 rounded out**
  that first curated set; **7 more** (`heart`/`globe`/`users`/`user-check`/`lock`/`trash`/
  `bookmark`) were added for a real, concrete consumer — see "Real-world additions" below.
- **The public name of two icons differs from their upstream file name**: `search` is sourced from
  Font Awesome's `magnifying-glass.svg`, `trash` from `trash-can.svg` — Zanix's own chosen
  vocabulary, not inherited verbatim from the provider, so a future source swap never has to rename
  either icon's public id.
- Each symbol keeps its own real `viewBox` — NOT normalized to a single shared value (12 of the 24
  use a narrower box than `0 0 512 512`; see `CATALOG_VIEWBOX` in `@zanix/space-ui`'s own
  `src/components/CatalogIcon/types.ts`).
- Every path kept its original `fill="currentColor"` — no color was hardcoded, so the catalog tints
  via ordinary CSS `color` inheritance, the same mechanism any theme (default, dark, custom, or
  none) already relies on.

## Attribution

Font Awesome's own `LICENSES/fontawesome-free-7.3.1.txt` states: _"Downloaded Font Awesome Free
files already contain embedded comments with sufficient attribution."_ Rather than duplicate that
comment once per symbol, this sprite carries **one combined attribution comment** at the top of
`catalog.svg`, copied verbatim from the source files:

```
<!--! Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2026 Fonticons, Inc. -->
```

Do not remove this comment when copying/regenerating this file — see Font Awesome's own request in
their license ("we ask that you do not actively work to remove them from files").

## The 24 Font Awesome icons in this catalog

`spinner`, `close`, `gear`, `phone`, `envelope`, `arrow-up`, `arrow-down`, `arrow-left`,
`arrow-right`, `map-location-dot`, `search`, `check`, `plus`, `minus`, `triangle-exclamation`,
`circle-info`, `circle-check`, `heart`, `globe`, `users`, `user-check`, `lock`, `trash`, `bookmark`
— this list, `CatalogIconName` (`@zanix/space-ui`'s `src/components/CatalogIcon/types.ts`),
`CATALOG_VIEWBOX`, and the `<symbol id="...">` set inside `catalog.svg` are meant to always agree
exactly; `space-ui`'s own test suite checks this (see `catalog-integrity.test.ts`).

## Real-world additions: `heart`, `globe`, `users`, `user-check`, `lock`, `trash`, `bookmark`

Added for `@presenza/web`'s own wishlist workspace (a "who can see this list" audience picker —
`everyone`/`connections`/`custom-include`/`custom-include`-empty, the same `VisibilityScope`
primitive `@presenza/domain-kit` documents as reusable across any audience-scoped content) — a real
consumer need, not a speculative "might want this later" addition:

- **`heart`** — a saved/favorites-list indicator.
- **`globe`** — "everyone can see this."
- **`users`** — "only my connections."
- **`user-check`** — "only these specific people."
- **`lock`** — "only me."
- **`trash`** — a delete action — this one has no audience-picker role at all, added alongside the
  other five because it filled a real, separate gap in this catalog (no delete/remove glyph existed
  here yet, despite `close`/`minus` covering adjacent but distinct actions) surfaced by the same
  feature.
- **`bookmark`** — a "save this to a wishlist" action, for a quick-add control on a product card
  (`@presenza/web`'s own Discovery/Home product grid) — deliberately distinct from `heart` above:
  `heart` already means "the fixed Favorites list" specifically elsewhere in this same consumer's
  UI, so reusing it here (a generic "add to ANY of my lists" action, not specifically Favorites)
  would overload one glyph with two different meanings in the same app.

All seven are stock Font Awesome Free 7.3.1 Solid icons — no different in provenance/license from
the original 17, just curated later, against a real call site instead of "rounding out" the set in
the abstract.

## Zanix-original additions: `verified`, `clock`, `shield`

`catalog.svg` also carries three symbols that are **not** Font Awesome content — a small
trust/verification-status set, each a plain open stroke, never a solid fill:

- **`verified`** — an open checkmark (`M5 13l4 4L19 7`, `viewBox="0 0 24 24"`, `stroke-width="2"`) —
  a "verified" status.
- **`clock`** — a circle plus clock hands (`<circle r="9">` + `M12 7v6l4 2`, `viewBox="0 0 24 24"`,
  `stroke-width="1.8"`) — a "pending" status.
- **`shield`** — a shield outline plus an inner checkmark
  (`M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z` + `M9.5 12l1.8 1.8L15 10`, `viewBox="0 0 24 24"`,
  `stroke-width="1.8"`) — an "unverified"/"rejected" status.

Font Awesome's free tier ships only the Solid weight (filled shapes) — there is no real upstream
file any of these three could have been extracted from, so they're original Zanix artwork instead,
added directly into this shared sprite (a deliberate product decision, not a licensing oversight)
rather than through a second, parallel catalog file. Licensed the same as the rest of this package's
own source (this repo's own `LICENSE`), not CC BY 4.0 — there is no third-party attribution to track
for any of them. `catalog-integrity.test.ts` encodes this as the real, named exception to "every
symbol uses `fill="currentColor"`."

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
