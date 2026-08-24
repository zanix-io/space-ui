import { useEffect, useState } from 'react'
import { subscribeScript } from './script-loader-dom.ts'
import type { ScriptLoaderState } from './script-loader-dom.ts'

const IDLE_STATE: ScriptLoaderState = { status: 'idle', error: null }

/**
 * The per-renderer hook wiring `script-loader-dom.ts`'s pure registry into a real component's
 * render cycle — `Recaptcha`/`HCaptcha`/`Turnstile` all use this (React binding; see
 * `use-script-loader.preact.ts` for the Preact one).
 *
 * Starts at `'idle'` — the SSR-safe "nothing attempted yet" state, the same shape `usePosition`'s
 * own `null`-until-first-measurement and `Counter`'s own `hasIntersected === false` already
 * establish for seam 6 (the first render must be deterministic). The real `<script>` injection only
 * ever happens inside this hook's own effect, which never runs during SSR or the very first client
 * render before mount — so SSR output and the first client paint are always `'idle'`, byte-identical,
 * with no `window`/`document` read during render at all.
 */
export function useScriptLoader(src: string, providerLabel: string): ScriptLoaderState {
  const [state, setState] = useState<ScriptLoaderState>(IDLE_STATE)

  useEffect(() => {
    return subscribeScript(src, providerLabel, setState)
    // `subscribeScript` itself dedupes by `src` (see its own doc) — re-subscribing whenever `src`
    // changes (e.g. a caller switches `siteKey`, which changes the resolved URL) is correct: the
    // previous subscription is unsubscribed by this effect's own cleanup first.
  }, [src, providerLabel])

  return state
}
