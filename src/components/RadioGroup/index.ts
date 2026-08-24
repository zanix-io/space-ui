import { createElement, Fragment, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createRadioGroup } from './render.ts'
import type { RadioGroupBaseProps, RadioGroupItemBase } from './types.ts'

/** One radio option: {@linkcode RadioGroupItemBase} plus its `Button`'s visible content. */
export type RadioGroupItem = RadioGroupItemBase & {
  /** The visible content of this item's own `Button` — icon, text, or both, same "content, not a
   * pre-built element" contract `Disclosure`'s own `trigger` already has (this component owns and
   * renders the actual `Button`, `children` is just what goes inside it). */
  children: ReactNode
}

/** {@linkcode RadioGroupBaseProps} plus the list of selectable items. */
export type RadioGroupProps = RadioGroupBaseProps & {
  items: RadioGroupItem[]
}

/**
 * A single-select set of `Button`s wired as the WAI-ARIA radiogroup pattern: `role="radiogroup"`
 * wrapping `role="radio"` items, roving tabindex (arrow keys move — and immediately select — the
 * focused item; only the selected one, or the first when nothing is selected yet, sits in the
 * normal `Tab` sequence). Real implementation shared with the Preact binding via `render.ts`'s own
 * `createRadioGroup` (see that file's own doc for how — hook injection); import from
 * `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered behavior. No
 * legacy equivalent — new; the same shape also correctly covers a visually segmented single-select
 * control (a toolbar-styled option set) — ARIA cares about the logical single-select relationship,
 * not how it's styled, so no separate component exists for that case. Deliberately does NOT cover a
 * multi-select toggle group (several independently-pressable buttons, `aria-pressed` rather than
 * `aria-checked`, no roving tabindex at all under the WAI-ARIA APG's own guidance) — a genuinely
 * different widget, `Button` doesn't support `aria-pressed` yet either, and nothing here has needed
 * it.
 *
 * First real consumer of `createRovingKeyDownHandler` (`shared/roving-focus.ts`), built ahead of
 * one — this is the concrete shape that justified it: the WAI-ARIA APG's own radiogroup pattern is
 * the canonical roving-tabindex example.
 *
 * Items are looked up fresh from the DOM via a container ref + `querySelectorAll('[role="radio"]')`
 * at navigation time, not cached refs per item — same "read the current DOM, don't cache it"
 * approach `shared/escape-to-close.ts`'s own `getRefocusTarget` already takes, and what lets this
 * compose `Button` unmodified rather than needing it to forward a `ref`.
 */
export const RadioGroup: (props: RadioGroupProps) => ReactElement = createRadioGroup<
  ReactElement,
  ReactNode
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useRef, useState },
  Fragment,
)
