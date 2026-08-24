import type { RovingFocusOrientation } from 'shared/roving-focus.ts'

/**
 * Shared base for `TabItem`/`TabsProps` — `label`/`children` are genuinely renderer-specific, same
 * reasoning `RadioGroupItemBase` doesn't declare its own `children` either; each renderer's own
 * `index.ts`/`index.preact.ts` layers those on top with its own node type.
 */
export type TabItemBase = {
  /** The actual identity of this tab — always meaningful, same "no index fallback" contract
   * `RadioGroupItem.value` already has (unlike `Accordion`'s own optional, index-fallback `id`). */
  value: string
}

/** Props shared by both the React and Preact `Tabs` bindings. */
export type TabsBaseProps = {
  /** Controlled selected tab — when given, this component's own internal state is never the
   * source of truth; the caller must update this prop (typically from `onValueChange`) for the
   * active tab to actually change. Omit for the uncontrolled default, where `defaultValue` seeds
   * the first render and this component tracks the rest itself. Always wins over `defaultValue`
   * when both are given — ignored, not invalid, same contract established for `Disclosure`/
   * `Accordion`/`Menu`/`RadioGroup`. */
  value?: string
  /**
   * Initial selected tab — seeds the first render only, ignored once `value` is given. Unlike
   * `RadioGroup.defaultValue` (where nothing selected is a real, valid state), a tablist with
   * nothing selected shows no panel at all — a broken UI, not a legitimate empty state — so this
   * defaults to the first item's own `value` when omitted, not to nothing.
   */
  defaultValue?: string
  /** Called whenever the active tab changes — a click on a tab, or an arrow key moving to a new
   * one (the WAI-ARIA APG's own default "automatic activation" behavior: moving focus with arrow
   * keys selects the newly focused tab immediately, same behavior `RadioGroup`'s own
   * `onValueChange` already has for the identical reason) — regardless of whether `value` is
   * controlled. Fires even in the uncontrolled case (same "always notify" contract established
   * throughout). */
  onValueChange?: (value: string) => void
  /** Arrow-key axis for roving focus among tabs.
   * @default 'horizontal' */
  orientation?: RovingFocusOrientation
  /** Accessible name for the `role="tablist"` root — required, same "a group needs a name"
   * contract `RadioGroup.label`/`Menu.label` already have. */
  label: string
  id?: string
  className?: string
}
