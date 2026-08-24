import type { CreateElement } from 'typings/renderer.ts'
import type { ScriptLoaderState } from 'shared/script-loader-dom.ts'
import type { CaptchaWidgetSize } from 'shared/captcha-types.ts'
import type { HCaptchaProps } from './types.ts'

/** The default script URL — always used unless {@linkcode HCaptchaProps.scriptSrc} overrides it;
 * see that prop's own doc for the real cases an override exists for. */
const HCAPTCHA_DEFAULT_SCRIPT_SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit'

/** The one slice of hCaptcha's real `window.hcaptcha` this component calls — typed narrowly here
 * rather than pulled in as a third-party `@types` dependency this package would then have to carry
 * and version. Cast through `unknown` at this one boundary, same technique `Recaptcha/render.ts`'s
 * own `GrecaptchaApi` already establishes for this exact shape of foreign global. */
type HcaptchaApi = {
  render: (
    container: Element,
    parameters: {
      sitekey: string
      size?: CaptchaWidgetSize
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: (err?: unknown) => void
    },
  ) => string
  execute: (widgetId: string) => void
  reset: (widgetId?: string) => void
}

function getHcaptcha(): HcaptchaApi | undefined {
  return (globalThis as unknown as { hcaptcha?: HcaptchaApi }).hcaptcha
}

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 *
 * `useScriptLoader` is itself injected too, not imported directly — already a per-renderer pair
 * (`shared/use-script-loader.ts`/`.preact.ts`, body-identical between the two, same shape
 * `usePosition`/`useCloseOnOutside` already have), so `index.ts`/`index.preact.ts` each pass their
 * own already-bound one in, the same way `Popover/render.ts`'s own `PopoverHooks` already does for
 * `usePosition`.
 */
export type HCaptchaHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useScriptLoader: (src: string, providerLabel: string) => ScriptLoaderState
}

/**
 * The real implementation of `HCaptcha`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`, extended with `useScriptLoader` injected alongside the
 * ordinary hooks (see {@linkcode HCaptchaHooks}'s own doc).
 *
 * See `index.ts`'s own doc for the full public behavioral contract (checkbox vs. invisible modes,
 * SSR/hydration, CSP, the two separate error sources, real end-to-end usage examples) — not
 * repeated here.
 */
export function createHCaptcha<E>(
  h: CreateElement<E>,
  hooks: HCaptchaHooks,
): (props: HCaptchaProps) => E {
  return function HCaptcha(props: HCaptchaProps): E {
    const {
      siteKey,
      onVerify,
      size,
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
      scriptSrc ?? HCAPTCHA_DEFAULT_SCRIPT_SRC,
      'hCaptcha',
    )

    // Render the widget exactly once, the first time the script becomes ready — see this function's
    // own doc for why `siteKey`/`size` are deliberately NOT dependencies (a live re-render isn't a
    // supported operation).
    hooks.useEffect(() => {
      if (status !== 'ready' || hasRendered) return
      const container = containerRef.current
      const hcaptcha = getHcaptcha()
      if (!container || !hcaptcha) return

      widgetIdRef.current = hcaptcha.render(container, {
        sitekey: siteKey,
        size,
        callback: (token: string) => onVerifyRef.current(token),
        'expired-callback': () => onExpireRef.current?.(),
        'error-callback': (err?: unknown) => onErrorRef.current?.(err),
      })
      setHasRendered(true)
    }, [status, hasRendered])

    // Script-load failure (network or CSP block) — a separate error source from the SDK's own
    // error-callback above, routed to the same `onError`. See `types.ts`'s own doc.
    hooks.useEffect(() => {
      if (error) onErrorRef.current?.(error)
    }, [error])

    // `verifyTrigger`: explicit re-verification — the real `execute(widgetId)` call `size:
    // 'invisible'` needs, since no checkbox exists for the user to click.
    hooks.useEffect(() => {
      if (verifyTrigger === undefined || status !== 'ready' || widgetIdRef.current === null) return
      getHcaptcha()?.execute(widgetIdRef.current)
    }, [verifyTrigger])

    // `resetTrigger`: force `.reset()` — lets a user retry after a server-side rejection.
    hooks.useEffect(() => {
      if (resetTrigger === undefined || status !== 'ready' || widgetIdRef.current === null) return
      getHcaptcha()?.reset(widgetIdRef.current)
    }, [resetTrigger])

    return h('div', { id, className, ref: containerRef, 'data-space-ui': 'hcaptcha' })
  }
}
