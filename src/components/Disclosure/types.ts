/**
 * Shared base for `DisclosureProps` — `trigger`/`children` are genuinely renderer-specific, same
 * reasoning `Slider`'s own `SliderBaseProps` doesn't declare `children` either; each renderer's own
 * `index.ts`/`index.preact.ts` layers those on top with its own node type.
 */
export type DisclosureBaseProps = {
  /**
   * Controlled open state — when given, this component's own internal state is never the source of
   * truth; the caller must update this prop (typically from `onOpenChange`) for it to actually open
   * or close. Omit for the uncontrolled default, where `defaultOpen` seeds the first render and this
   * component tracks the rest itself. Always wins over `defaultOpen` when both are given — not an
   * invalid/ambiguous combination, the same "controlled prop takes precedence, default is simply
   * ignored" contract React's own `value`/`defaultValue` pair already has.
   */
  open?: boolean
  /** Initial open state — seeds the first render only, ignored once `open` is given.
   * @default false */
  defaultOpen?: boolean
  /** Called whenever the trigger is activated, regardless of whether `open` is controlled — fires
   * even in the uncontrolled case (same "always notify" contract a native `<input>`'s own `onChange`
   * has), so a caller can observe state without having to own it. Purely a notification when `open`
   * is omitted — this component still manages its own state either way. */
  onOpenChange?: (open: boolean) => void
  id?: string
  className?: string
}
