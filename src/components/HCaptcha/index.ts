import { createElement, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useScriptLoader } from 'shared/use-script-loader.ts'
import { createHCaptcha } from './render.ts'
import type { HCaptchaProps } from './types.ts'

/**
 * hCaptcha, checkbox or invisible — the client-side complement to `@zanix/auth`'s own
 * `captchaGuard`/`HCaptchaAdapter`, which verifies whatever token {@linkcode HCaptchaProps.onVerify}
 * hands you, entirely server-side. Real implementation shared with the Preact binding via
 * `render.ts`'s own `createHCaptcha` (see that file's own doc for how — hook injection, including
 * `useScriptLoader` itself); import from `@zanix/space-ui/preact` instead for the Preact one, same
 * contract, same rendered behavior.
 *
 * `Recaptcha`/`Turnstile` are deliberately three SEPARATE components, not one component with a
 * `provider` prop — see `Recaptcha/index.ts`'s own doc for the full reasoning (each provider ships
 * its own real client-side JS runtime, so three separate components keep a consumer using only
 * `HCaptcha` from pulling the other two providers' glue code into their bundle). All three share one
 * internal primitive (`shared/script-loader-dom.ts` + `shared/use-script-loader.ts`/`.preact.ts`) for
 * the one thing they genuinely have in common: inject a third-party `<script>` once, know when it's
 * ready.
 *
 * This component never imports anything from `@zanix/auth`, and never mentions
 * `X-Znx-Captcha-Token`/`CAPTCHA_TOKEN_HEADER` in real code — its responsibility ends at
 * {@linkcode HCaptchaProps.onVerify}. How the token reaches your backend (a fetch header, a hidden
 * form field, anything else) is entirely your own decision; see the `@example` below for one common
 * shape, mentioned only as documentation, never a real dependency.
 *
 * ## SSR / hydration
 *
 * The first render — server or client, before mount — is always the same inert, empty container
 * (`data-space-ui="hcaptcha"`, no children): no `window`/`document` read during render, satisfying
 * seam 6 the same way `Counter`/`usePosition` already do. The real `<script>` injection and widget
 * render both happen inside a post-mount effect, once, via `shared/use-script-loader.ts`'s own
 * `'idle'`-until-mount state. This component has no opinion on WHEN a caller mounts it — a
 * `@zanix/space` app deciding to lazy-mount it behind `comet="only"`, or a plain React/Preact app
 * mounting it immediately, both work identically; this package never imports anything from
 * `@zanix/space` itself here.
 *
 * ## Checkbox / invisible — one component, two real code paths
 *
 * - **Checkbox** (`size` omitted or `'normal'`/`'compact'`) — `hcaptcha.render` mounts a real,
 *   visible checkbox into this component's own container once the script is ready.
 *   {@linkcode HCaptchaProps.verifyTrigger} isn't needed for this mode (the checkbox resolves itself
 *   when clicked) but calling it is harmless.
 * - **Invisible** (`size: 'invisible'`) — still renders into this component's own container (no
 *   visible checkbox), but produces a token only once {@linkcode HCaptchaProps.verifyTrigger}
 *   changes, which calls the real `execute(widgetId)`.
 *
 * `siteKey`/`size`/{@linkcode HCaptchaProps.scriptSrc} are treated as fixed for the lifetime of one
 * mounted widget — changing any of them after the widget has already rendered doesn't re-render it
 * (hCaptcha's own API has no supported "swap the site key on an already-rendered widget" operation;
 * the correct way to change any of these is to remount the component, e.g. via a changed `key`). A
 * disclosed scope limit, the same spirit as `Combobox`'s own `noOptionsMessage` omission — not a
 * silent gap. See {@linkcode HCaptchaProps.scriptSrc}'s own doc for the real cases an override
 * exists for (a self-hosted/proxied mirror, an Enterprise/regional endpoint, a test double) — most
 * consumers never set this.
 *
 * ## Two separate error sources, both routed to the same `onError`
 *
 * See {@linkcode HCaptchaProps.onError}'s own doc for the full contract — the provider's own
 * `error-callback` and the `<script>` tag's own `load` failure (network OR CSP block, see below) are
 * both real, both routed to the same prop, never one replacing the other.
 *
 * ## CSP — a real, common gotcha in a `@zanix/space` app
 *
 * `@zanix/space`'s own zero-config CSP default is `script-src 'self' 'nonce-<random>'` (see
 * `@zanix/space`'s own `docs/middleware.md`) — this BLOCKS hCaptcha's `<script>` outright, since
 * `https://hcaptcha.com`/`https://*.hcaptcha.com` aren't in `script-src` and the script carries no
 * matching `nonce`. The challenge iframe hCaptcha renders is blocked too: with no explicit
 * `frame-src`, it falls back to `default-src 'self'`, which doesn't allow hCaptcha's hosts either.
 * Both failures are visible in the browser console (a real CSP violation report), never silent — but
 * this component's own `onError` DOES still fire for the blocked script (see above), so a caller
 * wiring `onError` gets a real, actionable signal even without opening devtools.
 *
 * Fix it with the FUNCTION form of `static headers.csp` — this keeps the automatic per-request nonce
 * coordination `@zanix/space`'s own hydration script depends on, while adding hCaptcha's hosts
 * alongside it (never replacing the nonce). hCaptcha's own docs recommend allowing both `hcaptcha.com`
 * and the `*.hcaptcha.com` wildcard (its asset host varies):
 *
 * ```tsx
 * // signup-page.tsx
 * export default class SignupPage extends SpacePageController {
 *   static headers = {
 *     csp: (nonce: string) => ({
 *       'script-src': ["'self'", `'nonce-${nonce}'`, 'https://hcaptcha.com', 'https://*.hcaptcha.com'],
 *       'frame-src': ['https://hcaptcha.com', 'https://*.hcaptcha.com'], // no nonce — never applies to frame-src
 *     }),
 *   }
 *   component = SignupView
 * }
 * ```
 *
 * A consumer OUTSIDE `@zanix/space` (a plain React/Preact app, or any app with no CSP configured at
 * all) needs none of this — this gotcha is specific to landing on a page that already has a strict
 * CSP in place.
 *
 * @example
 * ```tsx
 * // Checkbox — the common case: verify happens on click, then read the token at submit time.
 * function SignupForm() {
 *   const [token, setToken] = useState<string | null>(null)
 *
 *   const handleSubmit = async (formData: FormData) => {
 *     await fetch('/api/signup', {
 *       method: 'POST',
 *       // `CAPTCHA_TOKEN_HEADER` is `@zanix/auth`'s own exported constant (`'X-Znx-Captcha-Token'`)
 *       // — matching its literal name here is just one convention `captchaGuard` happens to expect
 *       // by default; `space-ui` itself never imports `@zanix/auth`, this header name is entirely
 *       // your own call.
 *       headers: token ? { 'X-Znx-Captcha-Token': token } : undefined,
 *       body: formData,
 *     })
 *   }
 *
 *   return (
 *     <form action={handleSubmit}>
 *       {/* ...real fields... *\/}
 *       <HCaptcha siteKey="10000000-..." onVerify={setToken} onExpire={() => setToken(null)} />
 *       <button type="submit" disabled={!token}>Sign up</button>
 *     </form>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Invisible — verify explicitly, right before submit, and retry after a server rejection.
 * function CheckoutForm() {
 *   const [token, setToken] = useState<string | null>(null)
 *   const [verifyTrigger, setVerifyTrigger] = useState(0)
 *   const [resetTrigger, setResetTrigger] = useState(0)
 *
 *   const handleSubmit = async (event: FormEvent) => {
 *     event.preventDefault()
 *     setVerifyTrigger((n) => n + 1) // → onVerify fires shortly after with a fresh token
 *   }
 *
 *   useEffect(() => {
 *     if (!token) return
 *     fetch('/api/checkout', { headers: { 'X-Znx-Captcha-Token': token } }).then((res) => {
 *       if (res.status === 403) setResetTrigger((n) => n + 1) // let the user retry
 *     })
 *   }, [token])
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <HCaptcha
 *         siteKey="10000000-..."
 *         size="invisible"
 *         onVerify={setToken}
 *         verifyTrigger={verifyTrigger}
 *         resetTrigger={resetTrigger}
 *       />
 *       <button type="submit">Place order</button>
 *     </form>
 *   )
 * }
 * ```
 */
export const HCaptcha: (props: HCaptchaProps) => ReactElement = createHCaptcha<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useEffect, useRef, useState, useScriptLoader },
)
