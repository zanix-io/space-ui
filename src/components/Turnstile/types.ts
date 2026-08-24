import type { TurnstileAppearance } from 'shared/captcha-types.ts'

/**
 * Props for {@linkcode Turnstile}. See `index.ts`'s own doc for the full contract — `appearance`
 * modes, `verifyTrigger`/`resetTrigger`, and the CSP gotcha every `@zanix/space` consumer needs to
 * know.
 */
export type TurnstileProps = {
  /** Cloudflare Turnstile site key (created in the Cloudflare dashboard) — required. Not resolved,
   * translated, or otherwise processed by this component; pass the real value straight through, the
   * same "already-resolved data" seam every component in this package keeps. */
  siteKey: string
  /**
   * Fires with the real verification token once the challenge resolves. A plain callback, the same
   * DOM-event-shaped idiom `IFrame.onLoad`/`Video.onError` already use — never a ref. What happens
   * to the token next is entirely the caller's own decision; this component's own responsibility
   * ends here. See `index.ts`'s own `@example` for one real way to transport it to a
   * `captchaGuard`-protected endpoint in `@zanix/auth`.
   */
  onVerify: (token: string) => void
  /**
   * Turnstile's own real widget-mode option, passed straight through to `turnstile.render`:
   * `'always'` (the default — Turnstile decides on its own, usually non-interactive, whether the
   * visitor needs a visible interaction) or `'interaction-only'` (never shows a visible widget
   * unless an interactive challenge is genuinely required). `'execute'` renders no widget UI at all
   * and produces a token only once {@linkcode verifyTrigger} changes — this component's real
   * equivalent of `Recaptcha`'s v2-invisible/v3 modes, using Turnstile's own real terminology
   * instead of inventing a `size`-shaped name that wouldn't match Turnstile's own docs.
   */
  appearance?: TurnstileAppearance
  /**
   * Controlled prop: change this (e.g. increment a counter, or swap in a new string) to request an
   * explicit re-verification — the real `execute(widgetId)` call this needs for `appearance:
   * 'execute'`, where no visible widget exists to resolve on its own. Calling it while `appearance`
   * is `'always'`/`'interaction-only'` is harmless (Turnstile's own widget already runs on render in
   * those modes; this just requests a fresh token). Has no effect while the script hasn't finished
   * loading yet. See `index.ts`'s own `@example` for a real "verify right before submit" usage.
   */
  verifyTrigger?: number | string
  /** Controlled prop: change this to force the widget's own `.reset()` — the real way to let a user
   * retry after a server-side rejection. */
  resetTrigger?: number | string
  /** Fires when a previously-verified token expires (the real `expired-callback` Turnstile's own SDK
   * exposes for this) — the caller's cue to prompt for re-verification, typically by bumping
   * {@linkcode verifyTrigger}. */
  onExpire?: () => void
  /**
   * Fires for either of two genuinely separate error sources, both real, never one standing in for
   * the other: (1) the provider's own SDK `error-callback` — Turnstile's own docs pass a real error
   * code string here, forwarded verbatim, never invented or reworded — and (2) the `<script>` tag
   * itself failing to load — a real network failure, or a Content-Security-Policy blocking it,
   * indistinguishable from each other at the script-element level (see `index.ts`'s own CSP section)
   * but always distinguishable from case (1) by content: a load failure's message names the script
   * `src` and points at `script-src`/`frame-src`.
   */
  onError?: (error: unknown) => void
  /**
   * Overrides the default script URL (`https://challenges.cloudflare.com/turnstile/v0/api.js`) —
   * an escape hatch, not something most consumers need. Real reasons to reach for it: a
   * self-hosted/proxied mirror (data-residency or ad-blocker-robustness requirements some
   * deployments have), or swapping in a test double during automated testing. Given verbatim to
   * the injected `<script src>`. Two different `siteKey`s that happen to share one custom
   * `scriptSrc` still share the same underlying `<script>` injection (dedup is keyed on the
   * resolved URL, same as the default — see `shared/script-loader-dom.ts`'s own doc).
   */
  scriptSrc?: string
  /** DOM `id` for the widget's own container element. */
  id?: string
  className?: string
}
