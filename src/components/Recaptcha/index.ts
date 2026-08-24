import { createElement, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useScriptLoader } from 'shared/use-script-loader.ts'
import { createRecaptcha } from './render.ts'
import type { RecaptchaProps } from './types.ts'

/**
 * Google reCAPTCHA v2 (checkbox or invisible) and v3 (score-based), one component covering all
 * three real modes — the client-side complement to `@zanix/auth`'s own `captchaGuard`/
 * `RecaptchaAdapter`, which verifies whatever token {@linkcode RecaptchaProps.onVerify} hands you,
 * entirely server-side. Real implementation shared with the Preact binding via `render.ts`'s own
 * `createRecaptcha` (see that file's own doc for how — hook injection, including `useScriptLoader`
 * itself); import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same
 * rendered behavior.
 *
 * `HCaptcha`/`Turnstile` are deliberately three SEPARATE components, not one component with a
 * `provider` prop — unlike `Video`'s single component covering several URL shapes (which only ever
 * rewrites a URL, no per-provider runtime), each captcha provider ships its own real client-side JS
 * runtime. Three separate components mean a consumer using only `Recaptcha` never pulls hCaptcha's
 * or Turnstile's own glue code into their bundle. All three share one internal primitive
 * (`shared/script-loader-dom.ts` + `shared/use-script-loader.ts`/`.preact.ts`) for the one thing they
 * genuinely have in common: inject a third-party `<script>` once, know when it's ready.
 *
 * This component never imports anything from `@zanix/auth`, and never mentions
 * `X-Znx-Captcha-Token`/`CAPTCHA_TOKEN_HEADER` in real code — its responsibility ends at
 * {@linkcode RecaptchaProps.onVerify}. How the token reaches your backend (a fetch header, a hidden
 * form field, anything else) is entirely your own decision; see the `@example` below for one common
 * shape, mentioned only as documentation, never a real dependency.
 *
 * ## SSR / hydration
 *
 * The first render — server or client, before mount — is always the same inert, empty container
 * (`data-space-ui="recaptcha"`, no children): no `window`/`document` read during render, satisfying
 * seam 6 the same way `Counter`/`usePosition` already do. The real `<script>` injection and widget
 * render both happen inside a post-mount effect, once, via `shared/use-script-loader.ts`'s own
 * `'idle'`-until-mount state. This component has no opinion on WHEN a caller mounts it — a
 * `@zanix/space` app deciding to lazy-mount it behind `comet="only"`, or a plain React/Preact app
 * mounting it immediately, both work identically; this package never imports anything from
 * `@zanix/space` itself here.
 *
 * ## v2 checkbox / invisible / v3 — one component, three real code paths
 *
 * - **v2 checkbox** (`action` omitted, `size` omitted or `'normal'`/`'compact'`) — `grecaptcha.render`
 *   mounts a real, visible checkbox into this component's own container once the script is ready.
 *   {@linkcode RecaptchaProps.verifyTrigger} isn't needed for this mode (the checkbox resolves
 *   itself when clicked) but calling it is harmless — Google's own API tolerates `execute()` on a
 *   normal-size widget, it just has no additional visible effect beyond what the checkbox already
 *   does.
 * - **v2 invisible** (`size: 'invisible'`) — still renders into this component's own container (no
 *   visible checkbox), but produces a token only once {@linkcode RecaptchaProps.verifyTrigger}
 *   changes, which calls the real `execute(widgetId)`.
 * - **v3** (`action` given) — no widget is rendered at all; {@linkcode RecaptchaProps.verifyTrigger}
 *   calls `grecaptcha.execute(siteKey, { action })` directly, which resolves the token as a Promise.
 *   Google renders its own fixed badge (bottom-right, real DOM outside this component's own
 *   container) automatically — this component doesn't try to hide, move, or otherwise manage it;
 *   Google's own terms require either showing that badge or displaying their reCAPTCHA branding text
 *   somewhere else on the page, a real requirement outside this component's own scope to enforce.
 *
 * `siteKey`/`size`/`action`/{@linkcode RecaptchaProps.scriptSrc} are treated as fixed for the
 * lifetime of one mounted widget — changing any of them after the widget has already rendered
 * doesn't re-render it (Google's own API has no supported "swap the site key on an already-rendered
 * widget" operation; the correct way to change any of these is to remount the component, e.g. via a
 * changed `key`). A disclosed scope limit, the same spirit as `Combobox`'s own `noOptionsMessage`
 * omission — not a silent gap.
 *
 * ## `scriptSrc`: an escape hatch, not a per-consumer default
 *
 * The script URL is computed from `siteKey`/`action` unless {@linkcode RecaptchaProps.scriptSrc}
 * overrides it — see that prop's own doc for the real cases this exists for (a self-hosted/proxied
 * mirror, reCAPTCHA Enterprise's different endpoint, a test double). Most consumers never set this;
 * it exists because the alternative (this component silently refusing to support Enterprise/proxied
 * deployments at all) is worse than a documented, narrow override with a real default.
 *
 * ## Two separate error sources, both routed to the same `onError`
 *
 * See {@linkcode RecaptchaProps.onError}'s own doc for the full contract — the provider's own
 * `error-callback` (fires with no arguments, so this component constructs a generic `Error`) and the
 * `<script>` tag's own `load` failure (network OR CSP block, see below) are both real, both routed
 * to the same prop, never one replacing the other.
 *
 * ## CSP — a real, common gotcha in a `@zanix/space` app
 *
 * `@zanix/space`'s own zero-config CSP default is `script-src 'self' 'nonce-<random>'` (see
 * `@zanix/space`'s own `docs/middleware.md`) — this BLOCKS Google's `<script>` outright, since
 * `https://www.google.com` isn't in `script-src` and the script carries no matching `nonce`. The
 * challenge iframe Google renders is blocked too: with no explicit `frame-src`, it falls back to
 * `default-src 'self'`, which doesn't allow `https://www.google.com` either. Both failures are
 * visible in the browser console (a real CSP violation report), never silent — but this component's
 * own `onError` DOES still fire for the blocked script (see above), so a caller wiring `onError`
 * gets a real, actionable signal even without opening devtools.
 *
 * Fix it with the FUNCTION form of `static headers.csp` — this keeps the automatic per-request nonce
 * coordination `@zanix/space`'s own hydration script depends on, while adding Google's hosts
 * alongside it (never replacing the nonce):
 *
 * ```tsx
 * // recaptcha-page.tsx
 * export default class SignupPage extends SpacePageController {
 *   static headers = {
 *     csp: (nonce: string) => ({
 *       'script-src': ["'self'", `'nonce-${nonce}'`, 'https://www.google.com', 'https://www.gstatic.com'],
 *       'frame-src': ['https://www.google.com'], // no nonce here — CSP never applies one to frame-src
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
 * // v2 checkbox — the common case: verify happens on click, then read the token at submit time.
 * function SignupForm() {
 *   const [token, setToken] = useState<string | null>(null)
 *
 *   const handleSubmit = async (formData: FormData) => {
 *     const res = await fetch('/api/signup', {
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
 *       <Recaptcha siteKey="6Lc..." onVerify={setToken} onExpire={() => setToken(null)} />
 *       <button type="submit" disabled={!token}>Sign up</button>
 *     </form>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // v3 / invisible — verify explicitly, right before submit, and retry after a server rejection.
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
 *       <Recaptcha
 *         siteKey="6Lc..."
 *         action="checkout"
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
export const Recaptcha: (props: RecaptchaProps) => ReactElement = createRecaptcha<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useEffect, useRef, useState, useScriptLoader },
)
