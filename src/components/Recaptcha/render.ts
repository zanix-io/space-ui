import type { CreateElement } from 'typings/renderer.ts'
import type { ScriptLoaderState } from 'shared/script-loader-dom.ts'
import type { CaptchaWidgetSize } from 'shared/captcha-types.ts'
import type { RecaptchaProps } from './types.ts'

/** The one slice of reCAPTCHA's real `window.grecaptcha` this component calls — typed narrowly
 * here rather than pulled in as a third-party `@types` dependency this package would then have to
 * carry and version. Cast through `unknown` at this one boundary, same technique
 * `HCaptcha/render.ts`'s own `HcaptchaApi` establishes for this exact shape of foreign global. */
type GrecaptchaApi = {
  ready: (callback: () => void) => void
  render: (
    container: Element,
    parameters: {
      sitekey: string
      size?: CaptchaWidgetSize
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    },
  ) => number
  execute(siteKey: string, options: { action: string }): Promise<string>
  execute(widgetId?: number): void
  reset: (widgetId?: number) => void
}

function getGrecaptcha(): GrecaptchaApi | undefined {
  return (globalThis as unknown as { grecaptcha?: GrecaptchaApi }).grecaptcha
}

/** The default script URL — always used unless {@linkcode RecaptchaProps.scriptSrc} overrides
 * it. */
function buildDefaultScriptSrc(siteKey: string, isScored: boolean): string {
  return isScored
    ? `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    : `https://www.google.com/recaptcha/api.js?render=explicit`
}

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 *
 * `useScriptLoader` is itself injected too, not imported directly — same reasoning
 * `HCaptcha/render.ts`'s own `HCaptchaHooks` already documents.
 */
export type RecaptchaHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useScriptLoader: (src: string, providerLabel: string) => ScriptLoaderState
}

/**
 * The real implementation of `Recaptcha`, shared identically between the React and Preact bindings
 * — same pattern as `Table/render.ts`, extended with `useScriptLoader` injected alongside the
 * ordinary hooks (see {@linkcode RecaptchaHooks}'s own doc).
 *
 * See `index.ts`'s own doc for the full public behavioral contract (the three modes, SSR/hydration,
 * CSP, the two separate error sources, real end-to-end usage examples) — not repeated here.
 */
export function createRecaptcha<E>(
  h: CreateElement<E>,
  hooks: RecaptchaHooks,
): (props: RecaptchaProps) => E {
  return function Recaptcha(props: RecaptchaProps): E {
    const {
      siteKey,
      onVerify,
      size,
      action,
      verifyTrigger,
      resetTrigger,
      onExpire,
      onError,
      scriptSrc,
      id,
      className,
    } = props
    const isScored = typeof action === 'string'

    const containerRef = hooks.useRef<HTMLDivElement | null>(null)
    const widgetIdRef = hooks.useRef<number | null>(null)
    const [hasRendered, setHasRendered] = hooks.useState(false)

    // Always call the LATEST callback prop, without making the widget-render effect below depend on
    // (and re-run whenever) `onVerify`/`onExpire`/`onError` change identity — re-running `render()`
    // on a container that already holds a live widget isn't a supported operation for any of these
    // providers. Assigning during render is safe here (never read during the same render, only from
    // a later effect/SDK callback) — the same "read the latest prop from a stable ref" technique
    // this package would otherwise need `useEffect` boilerplate for on every render.
    const onVerifyRef = hooks.useRef(onVerify)
    onVerifyRef.current = onVerify
    const onExpireRef = hooks.useRef(onExpire)
    onExpireRef.current = onExpire
    const onErrorRef = hooks.useRef(onError)
    onErrorRef.current = onError

    const resolvedScriptSrc = scriptSrc ?? buildDefaultScriptSrc(siteKey, isScored)
    const { status, error } = hooks.useScriptLoader(resolvedScriptSrc, 'reCAPTCHA')

    // Render the widget exactly once, the first time the script becomes ready — see this function's
    // own doc for why `siteKey`/`size`/`action` are deliberately NOT dependencies (a live re-render
    // isn't a supported operation). v3 (`isScored`) renders no widget at all.
    hooks.useEffect(() => {
      if (status !== 'ready' || isScored || hasRendered) return
      const container = containerRef.current
      const grecaptcha = getGrecaptcha()
      if (!container || !grecaptcha) return

      grecaptcha.ready(() => {
        widgetIdRef.current = grecaptcha.render(container, {
          sitekey: siteKey,
          size,
          callback: (token: string) => onVerifyRef.current(token),
          'expired-callback': () => onExpireRef.current?.(),
          'error-callback': () =>
            onErrorRef.current?.(
              new Error('reCAPTCHA reported an error via its own error-callback'),
            ),
        })
        setHasRendered(true)
      })
    }, [status, isScored, hasRendered])

    // Script-load failure (network or CSP block) — a separate error source from the SDK's own
    // error-callback above, routed to the same `onError`. See `types.ts`'s own doc.
    hooks.useEffect(() => {
      if (error) onErrorRef.current?.(error)
    }, [error])

    // `verifyTrigger`: explicit re-verification. v2 invisible/normal calls `execute(widgetId)`; v3
    // calls `execute(siteKey, { action })` directly, which resolves the token itself (no widget/
    // callback involved for v3 at all).
    hooks.useEffect(() => {
      if (verifyTrigger === undefined || status !== 'ready') return
      const grecaptcha = getGrecaptcha()
      if (!grecaptcha) return

      if (isScored && typeof action === 'string') {
        const scoredAction = action
        grecaptcha.ready(() => {
          grecaptcha.execute(siteKey, { action: scoredAction })
            .then((token) => onVerifyRef.current(token))
            .catch((err: unknown) => onErrorRef.current?.(err))
        })
      } else if (widgetIdRef.current !== null) {
        grecaptcha.execute(widgetIdRef.current)
      }
      // `siteKey`/`action`/`isScored` are deliberately not dependencies — see this function's own
      // doc on why they're treated as fixed for the lifetime of one mounted widget; only a real
      // `verifyTrigger` change should ever re-run this effect.
    }, [verifyTrigger])

    // `resetTrigger`: force `.reset()` — no-op in v3 mode (no persistent widget/session to reset;
    // see `types.ts`'s own doc on `RecaptchaProps.resetTrigger`).
    hooks.useEffect(() => {
      if (resetTrigger === undefined || status !== 'ready' || isScored) return
      const grecaptcha = getGrecaptcha()
      if (grecaptcha && widgetIdRef.current !== null) grecaptcha.reset(widgetIdRef.current)
    }, [resetTrigger])

    return h('div', { id, className, ref: containerRef, 'data-space-ui': 'recaptcha' })
  }
}
