import { createElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { usePosition } from 'shared/use-position.ts'
import { createSelect } from './render.ts'
import type { SelectBaseProps } from './types.ts'

/** {@linkcode SelectBaseProps} — nothing extra for the React binding. */
export type SelectProps = SelectBaseProps

/**
 * A single-select dropdown: a trigger `Button` showing the current selection, opening a positioned
 * popup listing options (`role="listbox"`), single selection via click or arrow keys. Real
 * implementation shared with the Preact binding via `render.ts`'s own `createSelect` (see that
 * file's own doc for how — hook injection, including `usePosition`/`useCloseOnOutside`); import
 * from `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered behavior.
 * No legacy equivalent — new. The WAI-ARIA "Collapsible Dropdown Listbox" pattern — a real
 * `role="listbox"`/`role="option"` popup, genuinely different from `Combobox`'s own
 * `role="combobox"`/`aria-autocomplete` pattern: no free-text filtering, and the trigger itself
 * is a real `<button>`, never a text input.
 *
 * ## Trigger composes `Button` verbatim — inherits `data-space-ui="button"`, no redundant hook
 *
 * Same "composed, not reimplemented" rule `ImgButton`/`Showcase` already establish: the trigger
 * genuinely IS a `Button` (visible content = the selected option's `label`, or `placeholder`), so
 * it carries only `Button`'s own hook. The listbox itself carries `"select-listbox"`, each option
 * `"select-option"` — the same `"<name>-listbox"`/`"<name>-option"` convention `Combobox` already
 * established, not a new one.
 *
 * ## Real DOM focus moves onto the listbox itself on open — `aria-activedescendant`, like
 * `Combobox`, but the focus-holding element is the `<ul>`, not an `<input>`
 *
 * `Combobox`'s `<input>` needs to keep literal focus because typing has to keep landing there.
 * `Select` has no such need once the popup is open — but the options themselves are plain
 * `<li role="option">`, not independently focusable/tabbable elements the way `RadioGroup`'s own
 * `Button` items are, so this still isn't roving TABINDEX (`createRovingKeyDownHandler`) either.
 * Instead: on open, an effect moves real focus onto the listbox `<ul tabIndex={-1}>`;
 * `aria-activedescendant` (computed via `shared/roving-focus.ts`'s own `getNextRovingIndex`,
 * called directly — never `createRovingKeyDownHandler`, which moves real focus per item) tracks
 * which option is current. Closing (`Escape`, a selection, or an outside click) always returns
 * real focus to the trigger button.
 *
 * ## Automatic activation — arrow keys commit immediately, like `RadioGroup`/`Tabs`, unlike
 * `Combobox`'s manual Enter-to-commit
 *
 * `Combobox` needs a separate "highlighted but not yet selected" cursor specifically because typing
 * can invalidate the highlight before `Enter` ever commits it. Nothing here types — so, matching
 * this package's own established single-select convention (`RadioGroup`/`Tabs`' automatic
 * activation), an arrow/`Home`/`End` key while open calls `onValueChange` immediately; there is no
 * separate not-yet-committed highlight state. `activeIndex` is therefore derived from the current
 * `value` every render (`options.findIndex`, falling back to `0`), the same derivation
 * `RadioGroup` already uses — never separate `useState`. `Enter`/`Space` while open only closes and
 * refocuses the trigger; they never themselves change `value` (it's already current, since
 * navigating already committed it).
 *
 * Disabled options are skipped during arrow navigation entirely (never landed on, never
 * `activedescendant`-highlighted) — the automatic-activation model has no inert "highlighted but
 * not selectable" state for a disabled option to sit in, unlike `Combobox`'s own manual model
 * (where a disabled option CAN be highlighted, only selecting it no-ops). Clicking a disabled
 * option directly still no-ops, the same "clicking a disabled option does nothing" contract
 * `Combobox` already established.
 *
 * ## `useCloseOnOutside` scopes to a container wrapping BOTH the trigger and the listbox
 *
 * The exact same real bug `Popover`/`Combobox`'s own docs already document in full: the listbox
 * renders as a SIBLING of the trigger's own wrapper, not nested inside it, so scoping
 * outside-detection to the trigger alone would treat every click on an option as "outside."
 *
 * ## Mouse selection needs `onMouseDown` `preventDefault`, not just `onClick` — same real bug
 * `Combobox` already found and fixed
 *
 * Clicking a plain, non-focusable `<li>` would otherwise blur the currently-focused listbox first
 * (the default browser mousedown behavior for a target outside the focused element), firing this
 * component's own blur-closes-the-listbox handler before the subsequent `onClick` selection could
 * ever run. Each option's `onMouseDown` calls `event.preventDefault()` specifically to suppress
 * that blur, applied here deliberately from the start rather than rediscovered.
 *
 * ## Listbox unmounts when closed, like `Combobox`/`Popover` — not `Tooltip`'s own always-mounted
 *
 * Its render cost scales with `options`, and `aria-controls` (unlike `aria-describedby`) tolerates
 * referencing a currently-unrendered id without issue, per the WAI-ARIA APG's own reference
 * implementations — same reasoning `Combobox`'s own doc already gives in full.
 *
 * ## Trigger element isn't directly ref-able — queried fresh from an owned wrapper, like
 * `Popover`/`Menu`/`RadioGroup` already do
 *
 * `Button` is a plain function component, not `forwardRef`-wrapped, so no `ref` can attach to its
 * real `<button>` DOM node directly. The trigger is wrapped in an owned
 * `<span style="display:contents">` this component DOES hold a ref to, and both `usePosition`'s
 * reference element and every refocus target are found by querying that wrapper fresh at the time
 * they're needed — the same "query fresh from the DOM, don't thread refs through a composed
 * component" approach `Popover`'s own `referenceRef`/`Menu`'s own `toggleWrapperRef` already
 * establish, never a new technique.
 *
 * ## No `aria-describedby`/`aria-invalid` passthrough in this first version
 *
 * A real, common `Field`-composition need in practice — deliberately left out for now, same
 * "disclosed, not guessed at" scope choice `Combobox`'s own doc already makes for
 * `noOptionsMessage`/loading state: `Button`'s own closed prop API has no such passthrough today
 * (only `aria-expanded`/`aria-controls`/`aria-current`), and extending it is a separate, wider
 * change this component's own addition shouldn't force. Revisit once a concrete case shows the
 * omission actually matters.
 */
export const Select: (props: SelectProps) => ReactElement = createSelect<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useRef, useState, useMemo, useEffect, useCloseOnOutside, usePosition },
)
