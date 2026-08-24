/**
 * Shared base for `AccordionItem`/`AccordionProps` — `trigger`/`children` are genuinely
 * renderer-specific, same reasoning `DisclosureBaseProps` doesn't declare them either; each
 * renderer's own `index.ts`/`index.preact.ts` layers those on top with its own node type.
 */
export type AccordionItemBase = {
  /** Stable identity for this item, used as the key in `openItems`/`defaultOpenItems`/
   * `onOpenItemsChange`. Falls back to the item's own index (as a string) when omitted — same
   * "optional, index-fallback" convention `Menu.items` already establishes for its own item keys.
   * Only worth giving an explicit `id` when items can reorder/be added/removed and open state must
   * still track the right section through that. */
  id?: string
}

/** Props shared by both the React and Preact `Accordion` bindings. */
export type AccordionBaseProps = {
  /** Whether more than one section can be open at once.
   * @default false — opening one section closes any other. */
  multiple?: boolean
  /**
   * Controlled open-item ids — when given, this component's own internal state is never the
   * source of truth; the caller must update this prop (typically from `onOpenItemsChange`) for
   * sections to actually open or close. Omit for the uncontrolled default, where
   * `defaultOpenItems` seeds the first render and this component tracks the rest itself. Always
   * wins over `defaultOpenItems` when both are given — ignored, not invalid, same contract
   * `Disclosure`'s own `open`/`defaultOpen` pair already has. `multiple` only governs what THIS
   * component computes when notifying a change (replace the open id vs. add/remove one from the
   * set) — it never rewrites an `openItems` array the caller controls, even one containing more
   * than one id while `multiple` is `false`; keeping that consistent is the caller's own job once
   * they've taken control.
   */
  openItems?: string[]
  /** Initial open-item ids — seeds the first render only, ignored once `openItems` is given.
   * Truncated to at most one id when `multiple` is `false` (this component's own initial state,
   * unlike the controlled case above, which it doesn't second-guess).
   * @default [] */
  defaultOpenItems?: string[]
  /** Called whenever a section opens or closes, regardless of whether `openItems` is controlled —
   * fires even in the uncontrolled case (same "always notify" contract `Disclosure`'s own
   * `onOpenChange` already has). Receives the full next set of open ids, not just the one that
   * changed. */
  onOpenItemsChange?: (openItems: string[]) => void
  id?: string
  className?: string
}
