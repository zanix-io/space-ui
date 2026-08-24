import type { RovingFocusOrientation } from 'shared/roving-focus.ts'

/**
 * Shared base for `RadioGroupItem`/`RadioGroupProps` — `children` is genuinely renderer-specific,
 * same reasoning `DisclosureBaseProps`/`AccordionItemBase` don't declare it either; each renderer's
 * own `index.ts`/`index.preact.ts` layers it on top with its own node type.
 */
export type RadioGroupItemBase = {
  /** The actual value this radio represents — always meaningful, unlike `Disclosure`/`Accordion`'s
   * own optional `id` (a pure React/Preact key fallback there); no index fallback here. */
  value: string
  /** Accessible-label override — same convention `Button.label` already has, for the case this
   * item's own visible content isn't readable text on its own (an icon-only segmented option). */
  label?: string
}

/** Props shared by both the React and Preact `RadioGroup` bindings. */
export type RadioGroupBaseProps = {
  /** Controlled selected value — when given, this component's own internal state is never the
   * source of truth; the caller must update this prop (typically from `onValueChange`) for
   * selection to actually change. Omit for the uncontrolled default, where `defaultValue` seeds
   * the first render and this component tracks the rest itself. Always wins over `defaultValue`
   * when both are given — ignored, not invalid, same contract established for `Disclosure`/
   * `Accordion`/`Menu`. No value matching any item (including omitted entirely) is a real, valid
   * state — a radiogroup with nothing checked yet — not an error. */
  value?: string
  /** Initial selected value — seeds the first render only, ignored once `value` is given.
   * @default undefined (nothing selected) */
  defaultValue?: string
  /** Called whenever selection changes — a click on an item, or an arrow key moving to a new one
   * (the WAI-ARIA APG's own radiogroup behavior: moving focus with arrow keys selects the newly
   * focused item immediately, unlike a listbox/tablist) — regardless of whether `value` is
   * controlled. Fires even in the uncontrolled case (same "always notify" contract established for
   * `Disclosure`/`Accordion`/`Menu`). */
  onValueChange?: (value: string) => void
  /** Arrow-key axis for roving focus among items.
   * @default 'horizontal' */
  orientation?: RovingFocusOrientation
  /** Accessible name for the `role="radiogroup"` root — required, same "a group needs a name"
   * contract `Menu.label` already has for its own `<nav>`. */
  label: string
  id?: string
  className?: string
}
