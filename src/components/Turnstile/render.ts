import type { CreateElement } from 'typings/renderer.ts'
import type { ScriptLoaderState } from 'shared/script-loader-dom.ts'
import type { TurnstileAppearance } from 'shared/captcha-types.ts'
import type { TurnstileProps } from './types.ts'

/** The default script URL — always used unless {@linkcode TurnstileProps.scriptSrc} overrides it;
 * see that prop's own doc for the real cases an override exists for. */
const TURNSTILE_DEFAULT_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

/** The one slice of Cloudflare's real `window.turnstile` this component calls — typed narrowly
 * here rather than pulled in as a third-party `@types` dependency this package would then have to
 * carry and version. Cast through `unknown` at this one boundary, same technique
 * `Recaptcha/render.ts`'s own `GrecaptchaApi` already establishes for this exact shape of foreign
 * global. */
type TurnstileApi = {
  render: (
    container: Element,
    parameters: {
      sitekey: string
      appearance?: TurnstileAppearance
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: (errorCode?: string) => void
    },
  ) => string
  execute: (widgetIdOrContainer: string | Element) => void
  reset: (widgetId?: string) => void
}

function getTurnstile(): TurnstileApi | undefined {
  return (globalThis as unknown as { turnstile?: TurnstileApi }).turnstile
}

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 *
 * `useScriptLoader` is itself injected too, not imported directly — same reasoning
 * `HCaptcha/render.ts`'s own `HCaptchaHooks` already documents.
 */
export type TurnstileHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useScriptLoader: (src: string, providerLabel: string) => ScriptLoaderState
}

/**
 * The real implementation of `Turnstile`, shared identically between the React and Preact bindings
 * — same pattern as `Table/render.ts`, extended with `useScriptLoader` injected alongside the
 * ordinary hooks (see {@linkcode TurnstileHooks}'s own doc).
 *
 * See `index.ts`'s own doc for the full public behavioral contract (`appearance` modes, SSR/
 * hydration, CSP, the two separate error sources, real end-to-end usage examples) — not repeated
 * here.
 */
export function createTurnstile<E>(
  h: CreateElement<E>,
  hooks: TurnstileHooks,
): (props: TurnstileProps) => E {
  return function Turnstile(props: TurnstileProps): E {
    const {
      siteKey,
      onVerify,
      appearance,
      verifyTrigger,
      resetTrigger,
      onExpire,
      onError,
      scriptSrc,
      id,
      className,
    } = props

    const containerRef = hooks.useRef<HTMLDivElement | null>(null)
    const widgetIdRef = hooks.useRef<string | null>(null)
    const [hasRendered, setHasRendered] = hooks.useState(false)

    // Always call the LATEST callback prop — see `Recaptcha/index.ts`'s own doc on this exact
    // technique and why the widget-render effect below deliberately doesn't depend on these.
    const onVerifyRef = hooks.useRef(onVerify)
    onVerifyRef.current = onVerify
    const onExpireRef = hooks.useRef(onExpire)
    onExpireRef.current = onExpire
    const onErrorRef = hooks.useRef(onError)
    onErrorRef.current = onError

    const { status, error } = hooks.useScriptLoader(
      scriptSrc ?? TURNSTILE_DEFAULT_SCRIPT_SRC,
      'Turnstile',
    )

    // Render the widget exactly once, the first time the script becomes ready — see this function's
    // own doc for why `siteKey`/`appearance` are deliberately NOT dependencies (a live re-render
    // isn't a supported operation).
    hooks.useEffect(() => {
      if (status !== 'ready' || hasRendered) return
      const container = containerRef.current
      const turnstile = getTurnstile()
      if (!container || !turnstile) return

      widgetIdRef.current = turnstile.render(container, {
        sitekey: siteKey,
        appearance,
        callback: (token: string) => onVerifyRef.current(token),
        'expired-callback': () => onExpireRef.current?.(),
        'error-callback': (errorCode?: string) => onErrorRef.current?.(errorCode),
      })
      setHasRendered(true)
    }, [status, hasRendered])

    // Script-load failure (network or CSP block) — a separate error source from the SDK's own
    // error-callback above, routed to the same `onError`. See `types.ts`'s own doc.
    hooks.useEffect(() => {
      if (error) onErrorRef.current?.(error)
    }, [error])

    // `verifyTrigger`: explicit re-verification — the real `execute(widgetId)` call `appearance:
    // 'execute'` needs, since no widget UI renders on its own in that mode.
    hooks.useEffect(() => {
      if (verifyTrigger === undefined || status !== 'ready' || widgetIdRef.current === null) return
      getTurnstile()?.execute(widgetIdRef.current)
    }, [verifyTrigger])

    // `resetTrigger`: force `.reset()` — lets a user retry after a server-side rejection.
    hooks.useEffect(() => {
      if (resetTrigger === undefined || status !== 'ready' || widgetIdRef.current === null) return
      getTurnstile()?.reset(widgetIdRef.current)
    }, [resetTrigger])

    return h('div', { id, className, ref: containerRef, 'data-space-ui': 'turnstile' })
  }
}
