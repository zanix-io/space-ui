import type { IconProps } from '../Icon/types.ts'

/**
 * The curated default icon catalog's known names — sourced from Font Awesome Free 7.3.1
 * (`svgs/solid/`); see `src/templates/shared/icons/NOTICE.md` (shipped alongside the sprite) for
 * licensing and the per-icon justification for each addition beyond the icons with confirmed real
 * usage in the legacy codebase. No icon here is a brand/social mark — those stay out of any
 * default catalog.
 *
 * This exact set of names is kept in agreement with the `<symbol id="...">`s in the real curated
 * sprite (`src/templates/shared/icons/catalog.svg`) and with {@linkcode CATALOG_VIEWBOX}
 * below — `catalog-integrity.test.ts` checks all three stay in sync. Nothing here is copyrighted
 * content — only names and verified dimensions, never path data.
 *
 * **`verified`/`clock`/`shield` are the three exceptions to "sourced from Font Awesome Free"**:
 * Font Awesome's free tier ships only the Solid weight (filled shapes) — no outline/stroke weight
 * exists there at all — so no real upstream file could ever produce the thin, open-stroke glyphs a
 * trust/verification-status UI needs (a checkmark badge, a pending clock, an unverified/rejected
 * shield). All three are original Zanix artwork instead, added directly here (a real product
 * decision, not a licensing oversight) rather than through a second, parallel catalog — see
 * `src/templates/shared/icons/NOTICE.md`'s own "Zanix-original addition" section for the full
 * accounting, and `catalog-integrity.test.ts` for how they're the only symbols allowed to differ
 * from the rest (a `stroke`-based glyph, not `fill="currentColor"`).
 */
export type CatalogIconName =
  | 'spinner'
  | 'close'
  | 'gear'
  | 'phone'
  | 'envelope'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'map-location-dot'
  | 'search'
  | 'check'
  | 'plus'
  | 'minus'
  | 'triangle-exclamation'
  | 'circle-info'
  | 'circle-check'
  | 'heart'
  | 'globe'
  | 'users'
  | 'user-check'
  | 'lock'
  | 'trash'
  | 'bookmark'
  | 'verified'
  | 'clock'
  | 'shield'

/**
 * Per-name `viewBox`, matching the real upstream Font Awesome Free 7.3.1 SVG for each icon
 * (`unpkg.com/@fortawesome/fontawesome-free@7.3.1/svgs/solid/{file}.svg`) — NOT assumed uniform:
 * 12 of these 24 use a narrower viewBox (`384 512`, `448 512`, or `640 512`) than the rest's
 * `0 0 512 512`. (This count was stale at "7 of 17" — left over from before this catalog grew past
 * its original 17-icon Font Awesome set; corrected here alongside adding `bookmark`.)
 *
 * The catalog symbol `id` is the name itself — no separate provider-specific id to track
 * (`search`'s own upstream file is `magnifying-glass.svg`; the public name is Zanix's own
 * vocabulary, chosen at curation time, never inherited verbatim from the source file name — a
 * source vs. curated-catalog naming split). A future source swap only needs to keep producing a
 * symbol under the same name; this type and `CatalogIcon` never change for that.
 */
export const CATALOG_VIEWBOX: Record<CatalogIconName, string> = {
  spinner: '0 0 512 512',
  close: '0 0 384 512',
  gear: '0 0 512 512',
  phone: '0 0 512 512',
  envelope: '0 0 512 512',
  'arrow-up': '0 0 384 512',
  'arrow-down': '0 0 384 512',
  'arrow-left': '0 0 512 512',
  'arrow-right': '0 0 512 512',
  'map-location-dot': '0 0 640 512',
  search: '0 0 512 512',
  check: '0 0 448 512',
  plus: '0 0 448 512',
  minus: '0 0 448 512',
  'triangle-exclamation': '0 0 512 512',
  'circle-info': '0 0 512 512',
  'circle-check': '0 0 512 512',
  heart: '0 0 512 512',
  globe: '0 0 512 512',
  users: '0 0 640 512',
  'user-check': '0 0 640 512',
  lock: '0 0 384 512',
  trash: '0 0 448 512',
  bookmark: '0 0 384 512',
  verified: '0 0 24 24',
  clock: '0 0 24 24',
  shield: '0 0 24 24',
}

/**
 * Props for a component built by {@linkcode createCatalogIcon} — same as {@linkcode IconProps}
 * minus `viewBox` (resolved internally from whatever name→viewBox map that component was built
 * with) and minus `name`'s own bare-`string` type (narrowed to `Name`, so an unknown name is a
 * compile error, never a silently broken sprite reference at runtime).
 *
 * Generic so it fits both this package's own default catalog (`CatalogIconProps`, below — `Name`
 * fixed to {@linkcode CatalogIconName}) and a consumer's own custom catalog built with
 * `createCatalogIcon`'s public, data-parametrized form (`Name` fixed to whatever keys their own
 * viewBox map has) — see `render.ts`'s own doc for when to reach for that.
 */
export type IconCatalogProps<Name extends string> = Omit<IconProps, 'name' | 'viewBox'> & {
  name: Name
}

/**
 * Props for {@linkcode CatalogIcon} specifically — {@linkcode IconCatalogProps} fixed to this
 * package's own curated {@linkcode CatalogIconName} set. Kept as its own named type (rather than
 * inlining `IconCatalogProps<CatalogIconName>` at every call site) since it predates the generic
 * form and is still the one most consumers reach for directly.
 */
export type CatalogIconProps = IconCatalogProps<CatalogIconName>
