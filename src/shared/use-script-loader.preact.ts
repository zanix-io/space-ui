import { useEffect, useState } from 'preact/hooks'
import { subscribeScript } from './script-loader-dom.ts'
import type { ScriptLoaderState } from './script-loader-dom.ts'

const IDLE_STATE: ScriptLoaderState = { status: 'idle', error: null }

/**
 * Preact binding — see `use-script-loader.ts`'s own doc for the full contract (why `'idle'` until
 * the first mount effect, why this is naturally SSR-safe) — not repeated here. Same contract, same
 * behavior, independent implementation — never `preact/compat`.
 */
export function useScriptLoader(src: string, providerLabel: string): ScriptLoaderState {
  const [state, setState] = useState<ScriptLoaderState>(IDLE_STATE)

  useEffect(() => {
    return subscribeScript(src, providerLabel, setState)
  }, [src, providerLabel])

  return state
}
