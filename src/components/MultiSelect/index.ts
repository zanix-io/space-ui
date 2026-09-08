import { createElement, useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { usePosition } from 'shared/use-position.ts'
import { createMultiSelect } from './render.ts'
import type { MultiSelectBaseProps } from './types.ts'

/** {@linkcode MultiSelectBaseProps} — nothing extra for the React binding. */
export type MultiSelectProps = MultiSelectBaseProps

/**
 * A multi-value tag/chip input: a text input paired with a filterable listbox (the same WAI-ARIA
 * "combobox with multi-select" pattern `Combobox`'s own single-value input already builds on),
 * plus a committed, removable chip for each picked value. Real implementation shared with the
 * Preact binding via `render.ts`'s own `createMultiSelect` (see that file's own doc for how — hook
 * injection, plus the one isolable `onChange`/`onInput` divergence `Input/render.ts` already
 * established the narrow-fix shape for); import from `@zanix/space-ui/preact` instead for the
 * Preact one, same contract, same rendered behavior. No legacy equivalent — new, filling the real
 * gap `Select`/`Combobox` leave (both single-select only, `value: string | null`, never
 * `values: string[]`).
 *
 * ## Two modes, one `allowCustomValue` prop — never two components
 *
 * - **`allowCustomValue: false`** (default) — a closed set, `Select`-shaped: typing only filters
 *   `options`; `Enter` or a click only ever commits an EXISTING option as a chip; free text is
 *   never added.
 * - **`allowCustomValue: true`** — a suggested set, `Combobox`-shaped: typing still filters
 *   `options`, but if the typed text exactly matches no option's own label (case-insensitive),
 *   `Enter` (or losing focus with a non-empty `inputValue`) commits the raw typed text itself as a
 *   new chip instead. A typed value that DOES exactly match an option's label selects that existing
 *   option rather than creating a duplicate-looking chip.
 *
 * Once committed, a free-text chip is indistinguishable from one picked from `options` — same
 * visual chip, same removability.
 *
 * ## Already-committed values are excluded from the listbox, not just marked
 *
 * `options` is still "already filtered by the caller for the current `inputValue`" (same
 * "presents data, never owns it" seam `Combobox.options`/`Select.options` already keep) — but this
 * component ADDITIONALLY excludes any option whose `value` is already in `values` from what it
 * renders and navigates, since only this component (not the caller) knows which values are already
 * committed. The listbox itself doesn't render at all once nothing is left to offer (every option
 * already picked, or `max` reached) — a real, deliberate divergence from `Combobox`'s own choice to
 * keep an empty listbox mounted; a duplicate pick makes no sense in either mode here.
 *
 * ## Chip removal — a real, composed `Button`, plus `Backspace` on an empty input
 *
 * Each chip renders a visible label and its own remove `Button` (`aria-label="Remove {label}"`,
 * `shared/close-button-icon.ts`'s own default inline "X" — same default `Modal`/`Drawer`/`Toast`
 * already use) — inherits `Button`'s own `data-space-ui="button"` hook, never a redundant one (the
 * chip's own wrapper carries `"multi-select-chip"` instead). `Backspace` on an already-empty input
 * removes the LAST committed chip — the common tag-input convention, in both modes.
 *
 * ## Real DOM focus never leaves the input — `aria-activedescendant`, exactly `Combobox`'s model
 *
 * Never roving tabindex — the same reasoning `Combobox/index.ts`'s own doc gives in full applies
 * verbatim here: `shared/roving-focus.ts`'s own `getNextRovingIndex` is called directly, never
 * `createRovingKeyDownHandler`.
 *
 * ## `max` caps commits, never removals
 *
 * Once `values.length` reaches `max`, selecting an option or committing free text becomes a silent
 * no-op (and the listbox stops rendering) until a chip is removed — removing a chip is never
 * blocked.
 *
 * ## A visually-hidden "N items selected" description
 *
 * Referenced via the input's own `aria-describedby` (merged with a caller-supplied one, if given) —
 * a static description, not an `aria-live` announcement, since nothing here needs to interrupt to
 * announce a transient change; `shared/live-region.ts`'s own `VISUALLY_HIDDEN_STYLE` is reused for
 * the styling only.
 *
 * ## Controlled `values`/`inputValue`/`open`, each with an uncontrolled fallback
 *
 * Same "always wins, ignored not invalid" contract every other stateful component here keeps —
 * `values`/`onValuesChange` is the single source of truth for the committed chips, the same
 * controlled/uncontrolled duality every other stateful component in this package keeps.
 *
 * ## Not a `Combobox` composition — a genuine sibling implementation instead
 *
 * `MultiSelect` doesn't render a real `<Combobox/>` internally (so it carries no `"combobox"` hook)
 * — the tight coupling a real composition would need (intercepting `Combobox`'s own internally-owned
 * `Enter`/blur handling to decide "select the highlighted option" vs. "commit free text" vs. "do
 * neither," from OUTSIDE that component, only via bubbled DOM events and `event.defaultPrevented`)
 * would be fragile in a way owning the input directly, the same way `Combobox` itself does, isn't.
 */
export const MultiSelect: (props: MultiSelectProps) => ReactElement = createMultiSelect<
  ReactElement
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useRef, useState, useCloseOnOutside, usePosition },
  'onChange',
)
