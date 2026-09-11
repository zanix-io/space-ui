import type { InputBaseProps } from '../Input/types.ts'

/**
 * Props for {@linkcode PasswordInput}, shared by both the React and Preact bindings — everything
 * {@linkcode InputBaseProps} accepts except `type` (this component owns that internally, toggling
 * between `'password'` and `'text'`), plus the visibility-toggle contract itself.
 */
export type PasswordInputBaseProps = Omit<InputBaseProps, 'type'> & {
  /** Controlled visibility — `true` shows the raw text (`type="text"`), `false`/omitted keeps it
   * masked (`type="password"`). Always wins over `defaultVisible` when both are given, ignored not
   * invalid, same contract established throughout this component family
   * (`Combobox.value`/`Input.value`). */
  visible?: boolean
  /** @default false */
  defaultVisible?: boolean
  /** Fires whenever the toggle button is activated — fires even in the uncontrolled case. */
  onVisibleChange?: (visible: boolean) => void
  /** Builds the toggle button's own accessible name from the CURRENT (pre-click) visibility state
   * — e.g. `'Show password'` while masked, `'Hide password'` once revealed. Defaults to exactly
   * those two English strings; override for a localized consumer, since this component has no i18n
   * mechanism of its own to derive one from (same "no i18n mechanism" contract
   * `MultiSelect.getSelectionDescription`/`SocialLinksInput`'s own hostname-detection docs already
   * establish for this package). */
  getToggleLabel?: (visible: boolean) => string
  /** This component's own default "eye"/"eye-off" icon strokes live in a self-rendered
   * `<style nonce={nonce}>` element, never an inline `style` attribute — required only when the
   * consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own zero-config default is
   * exactly this shape); without a matching nonce, a strict CSP blocks that `<style>` element,
   * leaving the default icon strokes at the SVG spec's own default width/caps (a real fallback,
   * never a crash) until a matching nonce is supplied. Irrelevant when `showIcon`/`hideIcon` are
   * both given — this component's own default icons never render at all in that case. Omit `nonce`
   * entirely when no such CSP is in effect — nothing here changes. */
  nonce?: string
}
