import type { CaptchaWidgetSize } from 'shared/captcha-types.ts'

/**
 * Props for {@linkcode HCaptcha}. See `index.ts`'s own doc for the full contract — checkbox
 * (`'normal'`/`'compact'`) and invisible (`size: 'invisible'`) modes, `verifyTrigger`/
 * `resetTrigger`, and the CSP gotcha every `@zanix/space` consumer needs to know.
 */
export type HCaptchaProps = {
  /** hCaptcha site key (created in the hCaptcha dashboard) — required. Not resolved, translated, or
   * otherwise processed by this component; pass the real value straight through, the same
   * "already-resolved data" seam every component in this package keeps. */
  siteKey: string
  /**
   * Fires with the real verification token once the challenge resolves — checkbox click, or
   * {@linkcode verifyTrigger}-driven `execute()` for the invisible size. A plain callback, the same
   * DOM-event-shaped idiom `IFrame.onLoad`/`Video.onError` already use — never a ref. What happens
   * to the token next is entirely the caller's own decision; this component's own responsibility
   * ends here. See `index.ts`'s own `@example` for one real way to transport it to a
   * `captchaGuard`-protected endpoint in `@zanix/auth`.
   */
  onVerify: (token: string) => void
  /**
   * Selects the rendering mode — a visible checkbox (`'normal'`, the default, or `'compact'`) or an
   * invisible widget (`'invisible'`) driven entirely by {@linkcode verifyTrigger}. Unlike
   * `Recaptcha`, hCaptcha has no separate pure-scoring (v3-equivalent) mode — no `action` prop
   * exists on this component for that reason.
   */
  size?: CaptchaWidgetSize
  /**
   * Controlled prop: change this (e.g. increment a counter, or swap in a new string) to request an
   * explicit re-verification — the real `execute()` call this needs for `size: 'invisible'`, where
   * no checkbox exists for the user to click. Has no effect while the script hasn't finished loading
   * yet. See `index.ts`'s own `@example` for a real "verify right before submit" usage.
   */
  verifyTrigger?: number | string
  /** Controlled prop: change this to force the widget's own `.reset()` — the real way to let a user
   * retry after a server-side rejection (a checked widget otherwise stays permanently "checked" even
   * after its token is rejected). */
  resetTrigger?: number | string
  /** Fires when a previously-verified token expires (the real `expired-callback` hCaptcha's own SDK
   * exposes for this) — the caller's cue to prompt for re-verification, typically by bumping
   * {@linkcode verifyTrigger} or asking the user to re-check the box. */
  onExpire?: () => void
  /**
   * Fires for either of two genuinely separate error sources, both real, never one standing in for
   * the other: (1) the provider's own SDK `error-callback` (hCaptcha's own docs don't guarantee an
   * argument is passed, so this component forwards whatever it receives, `undefined` included, as
   * the raw value — never invents detail hCaptcha itself doesn't provide), and (2) the `<script>` tag
   * itself failing to load — a real network failure, or a Content-Security-Policy blocking it,
   * indistinguishable from each other at the script-element level (see `index.ts`'s own CSP section)
   * but always distinguishable from case (1) by content: a load failure's message names the script
   * `src` and points at `script-src`/`frame-src`.
   */
  onError?: (error: unknown) => void
  /**
   * Overrides the default script URL (`https://js.hcaptcha.com/1/api.js?render=explicit`) — an
   * escape hatch, not something most consumers need. Real reasons to reach for it: a
   * self-hosted/proxied mirror (data-residency or ad-blocker-robustness requirements some
   * deployments have), an hCaptcha Enterprise/regional endpoint your account uses instead of the
   * public default, or swapping in a test double during automated testing. Given verbatim to the
   * injected `<script src>`. Two different `siteKey`s that happen to share one custom `scriptSrc`
   * still share the same underlying `<script>` injection (dedup is keyed on the resolved URL, same
   * as the default — see `shared/script-loader-dom.ts`'s own doc).
   */
  scriptSrc?: string
  /** DOM `id` for the widget's own container element. */
  id?: string
  className?: string
}
