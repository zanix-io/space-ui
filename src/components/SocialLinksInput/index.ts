import { createElement, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createSocialLinksInput } from './render.ts'
import type { SocialLinkEntry, SocialLinksInputBaseProps } from './types.ts'

export type { SocialLinkEntry, SocialLinkEntryPayload, SocialNetworkName } from './types.ts'

/** {@linkcode SocialLinksInputBaseProps} plus the React-specific `renderIcon` node type. */
export type SocialLinksInputProps = SocialLinksInputBaseProps & {
  renderIcon?: (entry: SocialLinkEntry) => ReactNode | null
}

/**
 * The editable counterpart to the display-only `SocialNetworks`: a form control for adding,
 * editing, and removing a user's own social links one at a time, each row auto-detecting which
 * network it points at from the URL alone. Real implementation shared with the Preact binding via
 * `render.ts`'s own `createSocialLinksInput` (see that file's own doc for how — hook injection, the
 * callback-`ref` focus technique, plus the `Input`-inherited `onChange`/`onInput` divergence); import
 * from `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered behavior.
 * Composes `Input` (each row's own URL field) and `Button` (remove/"+" controls) — inherits their
 * own `data-space-ui="input"`/`"button"` hooks, adding only its own root
 * `data-space-ui="social-links-input"`.
 *
 * Owns no form state beyond the list itself: no validation, no submission logic, no dirty-tracking
 * — `space-ui-architecture`'s seam 7, the same "presents data, never owns it" contract every
 * stateful component here keeps. Controlled `values`/`onValuesChange` with an uncontrolled
 * `defaultValues` fallback, same seam every other stateful component in this package already
 * follows.
 *
 * ## Network auto-detection
 *
 * `detectSocialNetwork` (see that module's own doc for the exact hostname table) recomputes
 * `entry.network` on every keystroke in that row's own URL field — a pure, synchronous hostname
 * parse, cheap enough to need no debounce or blur-only recomputation. Recognizes Instagram, X
 * (`x.com`/`twitter.com`), Facebook (`facebook.com`/`fb.com`), LinkedIn, TikTok, YouTube
 * (`youtube.com`/`youtu.be`), WhatsApp (`wa.me`/`whatsapp.com`), and Telegram
 * (`t.me`/`telegram.me`) by hostname; anything else that still parses as a URL is `'website'`; an
 * empty or unparseable value is `null`.
 *
 * ## Icon rendering — a render-prop, not a bundled catalog
 *
 * `renderIcon?: (entry) => Node | null` hands back the already-detected `entry.network` for the
 * caller to resolve into whatever icon it already has — an `<img>`, a plain `Icon` call, or (the
 * recommended shape for a per-network map) the caller's own `createCatalogIcon`-built component
 * bound to its own network sprite/viewBox map, the same `name`-resolves-`viewBox` ergonomics this
 * package's own `CatalogIcon` gets from that same public factory, just applied to a network glyph
 * set instead of the curated 17-icon one (see the `@example` below). This is the same reasoning
 * `Menu.visual` uses to avoid a static asset-catalog dependency this component's own module would
 * otherwise carry unconditionally. Omit `renderIcon` and a row simply renders no icon; every icon it
 * does return is wrapped in an `aria-hidden` container regardless of what it is, since a network
 * glyph here is purely decorative, never a row's own accessible name. This package's own curated
 * `CatalogIcon` set ships no network-representative glyphs (its 17 names are generic UI icons —
 * arrows, a spinner, a gear — none of which reads as Instagram/X/Facebook/etc., so mapping the 8
 * recognized networks onto that fixed set would misrepresent them); shipping a first-party generic
 * (non-brand) glyph catalog for them was evaluated and deliberately deferred, not planned — a
 * consumer's own `createCatalogIcon`-built map covers the same need today with no framework change.
 *
 * ## Manual network override — deliberately not built
 *
 * Hostname detection can be wrong (a shortened URL, a personal domain that redirects to a profile),
 * but it can only ever under-match to the generic `'website'` fallback — it never confuses one
 * recognized network for another (matching is exact-hostname/subdomain, never fuzzy). Given that,
 * and that `network` is never itself a submitted form field (a display-only convenience,
 * recomputed from `url`, not data the server needs a client-supplied copy of), a wrong guess has no
 * functional consequence, only a cosmetic one in a narrow, uncommon case — evaluated and
 * deliberately not built, not deferred as a near-term follow-up.
 *
 * ## Real HTML form integration
 *
 * A plain `<form method="post">` submission needs a real `name` attribute per field — but a
 * repeated `<input name="...">` sharing one name across several entries silently loses every value
 * but the last through some server-side form-parsing paths. This component sidesteps that
 * entirely by giving each row's own URL field a UNIQUELY-SUFFIXED `name`, computed at render time
 * from this component's own `name` prop plus that row's current index — `name="socialLinks"`
 * yields `socialLinks_0`, `socialLinks_1`, and so on for however many rows are currently rendered
 * at submit time (the suffix is positional, not a stable per-entry id — removing a row upstream
 * simply renumbers the remaining ones, which a real form submission's own snapshot at submit time
 * already reflects correctly). `network` is never itself a submitted field — only `url` is (see
 * {@linkcode SocialLinkEntryPayload}) — since it's a derived, recomputable display convenience, not
 * data the server needs a client-supplied copy of. With no `name` given, no row's field carries a
 * `name` attribute at all, the same opt-in-only contract `Input`/`FileInput`'s own `name` already
 * have.
 *
 * @example
 * ```tsx
 * // Own file, once — the same `createCatalogIcon` factory `CatalogIcon` itself is built from
 * // (also exported from this package), bound to the caller's own network sprite/viewBox map
 * // instead of space-ui's curated 17-icon set (which ships no network-representative glyphs —
 * // see "Icon rendering" above). The `as unknown as CreateElement<ReactElement>` cast is the same
 * // one `CatalogIcon`'s own `index.ts` needs — see that file's doc for why.
 * const SocialIcon = createCatalogIcon<ReactElement, SocialNetworkName>(
 *   createElement as unknown as CreateElement<ReactElement>,
 *   {
 *     instagram: '0 0 24 24',
 *     x: '0 0 24 24',
 *     facebook: '0 0 24 24',
 *     linkedin: '0 0 24 24',
 *     tiktok: '0 0 24 24',
 *     youtube: '0 0 24 24',
 *     whatsapp: '0 0 24 24',
 *     telegram: '0 0 24 24',
 *     website: '0 0 24 24', // sourced/licensed by the caller for every recognized network.
 *   },
 * )
 *
 * <SocialLinksInput
 *   name="socialLinks"
 *   values={links}
 *   onValuesChange={setLinks}
 *   placeholder="https://instagram.com/you"
 *   renderIcon={(entry) => {
 *     if (!entry.network || entry.network === 'website') {
 *       // No brand to resolve (or none detected yet) — space-ui's own already-shipped, license-safe
 *       // generic glyph, never a hard requirement to have a per-network asset ready for this case.
 *       return <CatalogIcon name="circle-info" href="/assets/icons/catalog.svg" />
 *     }
 *     return <SocialIcon name={entry.network} href="/assets/social-sprite.svg" />
 *   }}
 * />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast (here: `renderIcon`'s public `ReactNode`
// return type is wider than the bound factory's own `ReactElement`), same reasoning.
export const SocialLinksInput: (props: SocialLinksInputProps) => ReactElement =
  createSocialLinksInput<ReactElement>(
    createElement as unknown as CreateElement<ReactElement>,
    { useState, useRef },
    'onChange',
  ) as (props: SocialLinksInputProps) => ReactElement
