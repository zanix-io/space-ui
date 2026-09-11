import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { usePosition } from 'shared/use-position.ts'
import { createDatePicker } from './render.ts'
import type { DatePickerBaseProps } from './types.ts'

/** {@linkcode DatePickerBaseProps} — nothing extra for the React binding. */
export type DatePickerProps = DatePickerBaseProps

/**
 * A single-date picker: a trigger `Button` showing the formatted selected date, opening a
 * positioned popup with a day grid — plus, the single most important behavior this component
 * exists for, a dedicated YEAR-selection view reachable by clicking the currently-displayed year,
 * so picking a date decades in the past (a date of birth) never means paging back one month at a
 * time. Real implementation shared with the Preact binding via `render.ts`'s own `createDatePicker`
 * (see that file's own doc for how — hook injection, including `usePosition`/`useCloseOnOutside`);
 * import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered
 * behavior. No legacy equivalent — new. Closest sibling: `Select` (same trigger-`Button` +
 * positioned-popup shape, same controlled `value`/`open` contracts) — copied verbatim wherever this
 * component didn't have a genuinely new problem to solve.
 *
 * ## Never a free-text field, on purpose — a picker, not typed date entry
 *
 * The trigger is a real `<button>`, exactly like `Select`'s own trigger, never an `<input>` a
 * caller could type a raw date string into — sidesteps the well-known parsing/format ambiguity a
 * typed date field has (`01/02/03`: which of three components is the year?) entirely, rather than
 * trying to disambiguate it. Extended to time too, once `withTime` is on: the hour/minute controls
 * are `role="spinbutton"` (arrow-key adjust), never a bare `<input type="number">` stepper — see
 * "Time-of-day selection" below.
 *
 * ## Year navigation: click the year, get a 12-per-page year GRID — the core ask this component
 * exists to satisfy
 *
 * Clicking the year (always available, both from the day-grid header and the month-grid header)
 * switches the popup to a dedicated year-selection view: a paged grid of 12 years at a time (fixed
 * page boundaries — `year - (year % 12)` — not a sliding window, so paging forward and back always
 * lands on the same boundaries). Picking a year returns to the day view for that year, keeping the
 * previously-viewed month. Clicking the month name (a nice-to-have, not core to the ask) does the
 * same one level down: a 12-month grid for the current year.
 *
 * ## Month/year grid cells are plain, individually Tab-reachable `<button>`s — deliberately NOT
 * roving-tabindex, unlike the day grid
 *
 * Same reasoning `docs/architecture.md`'s own `Accordion` row already documents for its headers:
 * roving tabindex without a genuine arrow-key handler moving real focus would make every
 * `tabIndex={-1}` cell permanently unreachable by keyboard except the one currently active — a real
 * accessibility regression, not a simplification. The requirement this component is built from
 * only asks for full keyboard grid navigation on the DAY grid (arrow keys/`PageUp`/`PageDown`);
 * month/year selection stays a plain, individually-focusable button set instead, same as
 * `Accordion`'s headers.
 *
 * ## The day grid IS a real roving-tabindex `role="grid"` — real DOM focus moves between cells,
 * unlike `Select`'s/`Combobox`'s own `aria-activedescendant`
 *
 * The requirement this is built from is explicit: "each day cell a real, focusable gridcell" — the
 * WAI-ARIA grid pattern, not the listbox pattern `Select`/`Combobox` use. Exactly one cell (the
 * internal "cursor" — see below) carries `tabIndex={0}`; every other cell is `-1` but still
 * genuinely reachable, since `ArrowLeft`/`Right`/`Up`/`Down` (one day/one week),
 * `PageUp`/`PageDown` (one month), `Shift+PageUp`/`PageDown` (one year), and `Home`/`End`
 * (start/end of the visible month) all move real focus, matching the WAI-ARIA APG's own "Date
 * Picker Dialog" keyboard convention. `Enter`/`Space` commits the focused day; moving focus alone
 * never commits (a disabled day — outside `min`/`max` — CAN still be focused/navigated onto, only
 * committing it no-ops, the same "can be highlighted, only selecting it no-ops" model `Combobox`'s
 * own disabled option already establishes, not `Select`'s own "skip disabled during arrow nav"
 * automatic-activation model, which doesn't apply here since navigating never itself commits).
 *
 * ## One internal "cursor" is both the day-grid focus target AND which month/year is displayed
 *
 * A single piece of internal state (`cursor`, a `CalendarDate`, never part of the public controlled
 * contract) does double duty: `cursor.year`/`cursor.month` is which month the day grid (or the
 * month/year picker) currently shows, and `cursor` itself is exactly the day that has real
 * `tabIndex={0}` focus. Re-derived fresh from `value` (falling back to today's real local date, or
 * a fixed epoch pre-mount — see "Deterministic first render" below) every time the popup
 * transitions from closed to open, the same "derive from current value, don't let stale internal
 * state leak across sessions" reasoning `Select`'s own `activeIndex` derivation already follows —
 * never restored from a previous, already-closed session.
 *
 * ## Deterministic first render (seam 6) — `today` starts `null`, resolved only after mount
 *
 * An empty picker conventionally opens showing the CURRENT month — but reading `new Date()` during
 * render would make the server's render and the client's first paint genuinely disagree (different
 * wall-clock instants, worse right around midnight) for the one narrow case where the popup is
 * already open on the very first render (`defaultOpen`/a controlled `open={true}` with no `value`
 * yet). Same "start from an explicit no-data-yet state, refine after mount" idiom
 * `Counter`/`Showcase` already establish: `today` is `null` until a mount-only effect resolves it
 * via `date-utils.ts`'s own `getTodayLocal`; the cursor falls back to a fixed epoch date for the
 * (extremely narrow, SSR-with-`defaultOpen`-and-no-value) window before that effect runs, then
 * snaps to the real current month once it does.
 *
 * ## Ids: derived from props via a hash, never `useId()` or `useCometStableId()`
 *
 * This component has zero `@zanix/space` dependency (ships from the root barrel, not
 * `./runtime/*`), same category as `Menu` — see that component's own "Zero `@zanix/space`
 * dependency, by construction" doc for the full reasoning this one inherits verbatim: bare
 * `useId()` is unsound the moment this component ends up composed inside SOME Comet's own isolated
 * hydration root (present or future, authored by this package or a consumer), and
 * `useCometStableId()` (the general fix `NavDrawer` uses) isn't reachable from a component
 * architecturally required to stay `@zanix/space`-free. `render.ts`'s own `deriveStableCometId`
 * call, seeded from a hash of this component's own `id`/`placeholder`/`min`/`max`/`withTime` props
 * (not a single required prop the way `Menu`'s own `label` is, since nothing here is required —
 * accepted as the same narrow, disclosed residual `Menu`'s own doc already accepts for two
 * instances sharing identical seed props), is what the internal `panel` id is built from instead.
 *
 * ## Time-of-day selection (`withTime`)
 *
 * Opt-in, additive, `false` by default — the date-of-birth use case this component was built for
 * needs no time component, so nothing changes for it. When `withTime` is `true`:
 * - `value`/`defaultValue`/`onValueChange` carry `'YYYY-MM-DDTHH:mm'` (24-hour, MINUTE precision,
 *   never seconds — there's no UI here for selecting seconds, so emitting a trailing `:00` would
 *   claim a precision never actually offered) instead of a bare `'YYYY-MM-DD'`.
 * - The popup grows an `Hour`/`Minute` section below the day grid — each a real
 *   `role="spinbutton"` (`aria-valuemin`/`aria-valuemax`/`aria-valuenow`/`aria-valuetext`,
 *   `ArrowUp`/`ArrowDown` to adjust by one — wrapping at the boundary, `23 + 1 → 0` — `Home`/`End`
 *   to jump to the min/max), never a bare `<input type="number">` — the same "picker, not typed
 *   entry" philosophy the base date grid already applies, extended to time. Disabled
 *   (`aria-disabled`, not interactive) until a real day is already selected — adjusting a "time"
 *   with no day to attach it to has no value to commit, a deliberate, disclosed scope choice rather
 *   than inventing an implicit "today" attachment no one asked for.
 * - Picking a day no longer auto-closes the popup (unlike the date-only mode) — time still needs
 *   setting. A "Done" button closes and refocuses the trigger explicitly instead; `Escape` and an
 *   outside click still work exactly as before.
 * - `hourCycle` (`'h12'` AM/PM or `'h24'`, default `'h24'`) controls both the spinbutton section's
 *   own display and the trigger's own formatted value. No locale-DERIVED default — see `locale`
 *   below for why this stays an explicit prop rather than something inferred.
 *
 * ## `locale` is a plain, explicit prop — not read from `useIntl()`
 *
 * The requirement this is built from asks for locale-aware month/day names and trigger formatting,
 * pointing at "whatever locale mechanism `@zanix/space-ui`'s own `Formatter`/`IntlProvider`
 * exposes." Checked directly against `intl/formatter.ts`'s own `Formatter` interface: it exposes
 * `formatMessage`/`formatRichText` only — no `formatDate`, and no way to read the raw `locale`
 * string `IntlProvider` was given back out through `useIntl()` either. Extending `Formatter`'s own
 * public contract to add either is a separate, wider change than this component's own addition
 * should force — the same "disclosed, not guessed at" scope-limit precedent `Select`'s own missing
 * `aria-describedby` passthrough and `Combobox`'s own missing `noOptionsMessage` already establish.
 * Native `Intl.DateTimeFormat`/`Intl.NumberFormat` need no `@formatjs` dependency at all for this —
 * `locale` (BCP-47, default `'en'`) is a plain prop instead, so this component works standalone
 * (unlike `RichText`, it does NOT require an `<IntlProvider>` ancestor); a caller already inside one
 * passes the identical locale string straight through. Flagged as a real, disclosed gap worth a
 * design question (should `Formatter` grow a `locale` getter/`formatDate` for a future component
 * like this one to build on) rather than worked around by expanding this component's own scope.
 *
 * ## No `aria-describedby`/`aria-invalid`/`aria-label`/`aria-labelledby` passthrough in this first
 * version — same disclosed gap `Select` already has, not reinvented here
 *
 * The trigger composes `Button` verbatim, exactly like `Select`'s own trigger, and inherits the
 * identical constraint: `Button`'s own closed prop API has no such passthrough today (only
 * `aria-expanded`/`aria-controls`/`aria-current`), and extending it is a separate, wider change
 * this component's own addition shouldn't force on its own. `label` (accessible-name override,
 * `Select.label`/`Button.label`'s own convention) is the one accessible-name lever available, same
 * as `Select`.
 *
 * ## An optional trigger icon — the same composition `ImgButton.icon`/`.caption` already
 * establishes
 *
 * `icon` (real `IconProps`, passed straight through to `Icon`) renders alongside the trigger's own
 * text rather than replacing it — a date field commonly wants a calendar glyph next to its
 * formatted value/placeholder. Omitted, the trigger renders exactly as it always has (plain text,
 * no icon markup at all).
 */
export const DatePicker: (props: DatePickerProps) => ReactElement = createDatePicker<ReactElement>(
  createElementWithNonceHydrationFix as unknown as CreateElement<ReactElement>,
  { useRef, useState, useMemo, useEffect, useLayoutEffect, useCloseOnOutside, usePosition },
  Fragment,
)
