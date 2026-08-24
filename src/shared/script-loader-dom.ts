/**
 * Loads a third-party provider script (`Recaptcha`/`HCaptcha`/`Turnstile`'s own SDK) into `<head>`
 * at most once per distinct `src` — genuinely shared across every subscriber for that exact URL, so
 * two widgets of the SAME provider mounted on one page (e.g. two `Recaptcha` instances) never
 * inject a second `<script>` tag or pay for a second network fetch; each just subscribes to the one
 * shared load. A different `src` (a different provider, or the same provider with a different query
 * string — e.g. reCAPTCHA v2's `?render=explicit` vs. v3's `?render=<siteKey>`) gets its own,
 * independent entry.
 *
 * Never touches `document` at import time — only from inside {@linkcode subscribeScript}, which
 * every real caller (`use-script-loader.ts`/`.preact.ts`) only ever invokes from a `useEffect`, so
 * this module is naturally SSR-safe the same way `shared/overlay-stack.ts` already is: an entry is
 * only ever created on a real client mount, never during render or SSR.
 *
 * Pure logic, no React/Preact import at all — genuinely shareable between both bindings verbatim,
 * the same `positioning-dom.ts` (pure DOM measurement) / `use-position.ts`+`.preact.ts` (the
 * per-renderer hook wiring it into a render cycle) split this mirrors.
 *
 * Internal to this package for now (not exported from `mod.ts`/`mod-preact.ts`) — `Recaptcha`/
 * `HCaptcha`/`Turnstile` are its only three real consumers today, all inside this one feature.
 * Unlike `close-on-outside.ts`/`positioning.ts`/etc. (made public specifically because a consumer
 * app builds the identical shape of component around all the time), no evidence yet points at a
 * consumer app wanting a raw third-party-script loader as its own standalone primitive outside a
 * captcha widget — revisit if that ever becomes a real, not speculative, second use case.
 */

export type ScriptLoaderStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ScriptLoaderState = {
  status: ScriptLoaderStatus
  /**
   * Set only when `status === 'error'`, `null` otherwise — a human-readable hint, not a raw
   * `ErrorEvent`. Covers two causes JavaScript cannot tell apart on a `<script>`'s own native
   * `error` event: a real network failure, or the request being blocked before it ever reached the
   * network by a Content-Security-Policy `script-src` that doesn't allow this provider's host — see
   * {@linkcode subscribeScript}'s own doc for why the message names both rather than guessing which
   * one happened.
   */
  error: string | null
}

type ScriptEntry = {
  state: ScriptLoaderState
  subscribers: Set<(state: ScriptLoaderState) => void>
}

const registry = new Map<string, ScriptEntry>()

function notify(entry: ScriptEntry, state: ScriptLoaderState) {
  entry.state = state
  for (const subscriber of entry.subscribers) subscriber(state)
}

function buildLoadErrorMessage(providerLabel: string, src: string): string {
  return `Failed to load the ${providerLabel} script (${src}) — either a real network failure, or ` +
    `a Content-Security-Policy blocking the request before it ever left the browser (indistinguishable ` +
    `from JavaScript's own point of view). If this is a @zanix/space app, confirm script-src (and ` +
    `frame-src, for the provider's own challenge iframe) allow this provider's host.`
}

/**
 * Subscribes to `src`'s load state, injecting the real `<script src>` element the first time this
 * exact URL is requested across the whole page — a no-op beyond an immediate state replay on every
 * subsequent call for the same `src`, whether from this component instance or a different one.
 * `providerLabel` (e.g. `'reCAPTCHA'`) is only ever used to build a readable error message; it's
 * never part of the dedup key (that's `src` alone).
 *
 * The injected `<script>`'s native `load`/`error` events are the ONLY source of truth this function
 * reports on — it never reads a provider's own global (`window.grecaptcha`/`hcaptcha`/`turnstile`)
 * itself; a caller does that once `status === 'ready'`. A script's own `error` event is a genuinely
 * separate error source from whatever `error-callback` a provider's SDK exposes once (if) it does
 * load successfully — a caller wires both into the same `onError`, never one in place of the other;
 * see {@linkcode ScriptLoaderState.error}'s own doc for why the two script-level causes (network vs.
 * CSP block) are folded into one message rather than told apart.
 *
 * Returns an unsubscribe function. The underlying `<script>` element and registry entry are never
 * removed on unsubscribe — once a provider's SDK has loaded (or failed) for a given `src`, there's
 * no real benefit to re-fetching it for a later remount, the same "load once, keep" behavior every
 * provider's own official loader snippet already assumes.
 */
export function subscribeScript(
  src: string,
  providerLabel: string,
  subscriber: (state: ScriptLoaderState) => void,
): () => void {
  const existing = registry.get(src)
  const entry: ScriptEntry = existing ??
    { state: { status: 'loading', error: null }, subscribers: new Set() }

  if (!existing) {
    registry.set(src, entry)

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.addEventListener('load', () => notify(entry, { status: 'ready', error: null }))
    script.addEventListener(
      'error',
      () => notify(entry, { status: 'error', error: buildLoadErrorMessage(providerLabel, src) }),
    )
    document.head.appendChild(script)
  }

  entry.subscribers.add(subscriber)
  subscriber(entry.state)
  return () => entry.subscribers.delete(subscriber)
}
