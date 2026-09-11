import type { CreateElement } from 'typings/renderer.ts'
import { liveRegionProps, VISUALLY_HIDDEN_CSS } from 'shared/live-region.ts'
import type { CountdownBaseProps } from './types.ts'

/** The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createCounter}'s own `CounterHooks` established
 * (real `useEffect`/`useRef` usage, not just `useState` — see that file's own doc for why that's
 * sound here too). `useId` is injected for the same reason `Tooltip`/`Popover`/`Select` already
 * inject it: scoping this component's own `'ring'`-variant CSS (see `createCountdown`'s own doc,
 * "every hyphenated stroke attribute lives in `style`") to THIS instance, so two `Countdown` rings
 * mounted on the same page never fight over the same CSS rule. */
export type CountdownHooks = {
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
  useId: () => string
}

/** How often the wall clock is re-read, in milliseconds — finer than the 1s display granularity so
 * a numeric value that just ticked over, or a throttled tab catching up after being backgrounded,
 * both settle onto the correct value quickly, without the visible jank a plain 1000ms tick would
 * add on top of that correction. */
const TICK_INTERVAL_MS = 250

function resolveTargetMs(target: Date | number): number {
  return target instanceof Date ? target.getTime() : target
}

/** Ceiling-rounded so the final second of a countdown reads `"00:01"` for its own full second,
 * never flashing to `"00:00"` early the way a floor-rounded value would the instant less than a
 * full second remains. No hour rollover — a disclosed, deliberate scope limit for a component
 * aimed at short waits (an OTP resend, a flash-sale timer); pass a custom {@linkcode format} for
 * anything longer. */
function defaultFormat(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function defaultAnnouncement(remainingMs: number): string {
  if (remainingMs <= 0) return "Time's up"
  const minutes = Math.ceil(remainingMs / 60000)
  return minutes <= 1 ? 'Less than a minute remaining' : `${minutes} minutes remaining`
}

/**
 * The real implementation of `Countdown`, shared identically between the React and Preact bindings
 * — same `render.ts`-factory technique `Counter`'s own `createCounter` already establishes, real
 * `useEffect`/`useRef` usage included. Distinct from `Counter` (a fixed-duration count-UP reveal
 * animation) — this counts DOWN toward a real wall-clock instant, indefinitely re-anchored against
 * `Date.now()` on every tick, never a naive `setInterval` decrement (a `setInterval(() => setCount(c
 * => c - 1000), 1000)` shape drifts under any scheduling delay AND goes silently wrong across tab
 * backgrounding/throttling, where a browser can suspend timers for seconds or minutes at a stretch —
 * the very first tick after resuming would still only subtract one interval's worth). Recomputing
 * `target - Date.now()` fresh on every tick self-corrects for any such gap automatically, with no
 * special-case code needed for it.
 *
 * ## SSR / before the first tick: no visible value yet
 *
 * Same "start from an explicit no-data-yet state, refine after mount" idiom `Counter`/`DatePicker`
 * already establish, applied here for the same underlying reason `DatePicker`'s own "today" value
 * is: `remainingMs` starts `null` (identical on the server render and the client's first paint
 * before hydration) and is only ever computed from a real `Date.now()` read inside this component's
 * own mount effect — reading the clock during render itself would make the server's render and the
 * client's first paint genuinely disagree the instant they happen even a few milliseconds apart.
 * Once mounted, the very first effect run computes and shows a real value immediately (synchronous
 * within the effect, not gated behind the first `setInterval` tick), so the visible blank window is
 * as short as a mount effect ever is.
 *
 * ## `onComplete` — exactly once per `target`
 *
 * A `completedRef` boolean latches the instant `remainingMs` first reaches zero, guarding every
 * subsequent tick (including ones after this component re-renders for an unrelated reason while
 * already at zero) from calling {@linkcode CountdownBaseProps.onComplete} again. Resets only when
 * `target` itself changes to a genuinely different instant (this effect's own dependency), so
 * handing this component a fresh, later `target` after completion correctly starts a new countdown
 * that can complete again.
 *
 * ## `aria-live="polite"`, throttled to real boundaries — never once per second
 *
 * A fast-ticking number is a poor `aria-live` candidate read out in full (it would spam an
 * announcement every second) — the same "poor candidate" reasoning `Counter`'s own doc gives for
 * its animating digits, resolved oppositely here since periodic announcement IS the actual
 * requirement: this component announces only when the whole MINUTE count changes (`Math.ceil
 * (remainingMs / 60000)`), plus once more, unconditionally, the instant it reaches zero. The visible
 * `'numeric'`/`'ring'` text itself stays `aria-hidden` throughout — the live region is the one real
 * accessible surface for the current remaining time, never a redundant second announcement of the
 * same value.
 *
 * ## `'ring'` variant: `prefers-reduced-motion` disables the transition, never the update itself
 *
 * The progress ring's own `stroke-dashoffset` change gets a real `transition` — the one narrow,
 * deliberate exception to "no component-owned visual default" `Image.placeholder` already
 * establishes (see that file's own doc): smoothing a value that otherwise visibly jumps once per
 * tick is a functional readability concern for a live-updating ring, not a stylistic opinion
 * `className` could express instead (there is no element to select and no property value this
 * package could otherwise expose for it). `matchMedia('(prefers-reduced-motion: reduce)')` is read
 * once, in a mount effect (never during render, for the same SSR-determinism reason `remainingMs`
 * itself starts `null`) — when it matches, the transition is `'none'` and the ring still updates
 * every tick, just instantly rather than smoothly; the announced/formatted VALUE is never affected
 * either way.
 *
 * ## `'ring'` variant: every stroke declaration lives in a self-rendered `<style nonce={nonce}>`
 * element, never an inline `style` attribute
 *
 * `stroke-width`/`stroke-dasharray`/`stroke-dashoffset`/`stroke-linecap`/`transition` all used to be
 * applied via each circle's own inline `style` object — a real, confirmed CSP violation under a
 * nonce-based `style-src` (`@zanix/space`'s own zero-config default is exactly this shape): a CSP
 * nonce never applies to a `style="..."` attribute, only to a `<style>` element, and both React's
 * and Preact's own `style` PROP application go through that same attribute-level mechanism
 * internally (see `overlay-position-css.ts`'s own module doc for the full reasoning, identical
 * cause). Fixed the same way `Tooltip`/`Popover`/`Select` already fix their own dynamic positioning:
 * each circle carries a `data-countdown-ring-id`/`data-countdown-ring` marker instead of `style`,
 * and the actual declarations live in CSS text built fresh every render (this component already
 * re-renders on every `TICK_INTERVAL_MS` tick regardless, so recomputing this text alongside
 * `valueSpan`'s own text costs nothing extra) and rendered via a nonce'd `<style>` element —
 * `CountdownHooks.useId` scopes that CSS to THIS instance specifically, so two `Countdown` rings on
 * the same page never fight over the same rule. See `CountdownBaseProps.nonce`'s own doc for the
 * full CSP contract.
 *
 * `stroke-width`/`stroke-dasharray`/`stroke-dashoffset`/`stroke-linecap` are real SVG PRESENTATION
 * attributes with a hyphen in their own DOM name — a real, separately-confirmed React/Preact
 * divergence exists for the bare camelCase ATTRIBUTE form of these (React remaps it via its own
 * internal SVG attribute table; Preact does not, silently no-opping it) — moot here since every one
 * of them now lives in CSS text instead, never a JSX attribute or a `style` object either. Every
 * numeric value is given an explicit `'px'` suffix as a STRING in that CSS text for the identical
 * reason: React/Preact's own `style`-OBJECT default-unit handling for `stroke-width` diverges too
 * (unitless vs. `'px'`-appended), which building the CSS text as a plain string sidesteps entirely,
 * the same way the previous `style`-object version already did. `stroke`/`fill`/`cx`/`cy`/`r`/
 * `transform`/`opacity`/`viewBox` all stay plain attributes — none of them has a hyphenated real DOM
 * name, so neither divergence applies to any of them (the track circle's own dimming uses
 * whole-element `opacity` rather than `stroke-opacity` specifically to stay in this safe,
 * single-word set, harmless here since that circle's `fill` is already `'none'`).
 */
export function createCountdown<E>(
  h: CreateElement<E>,
  hooks: CountdownHooks,
): (props: CountdownBaseProps) => E {
  return function Countdown(props: CountdownBaseProps): E {
    const {
      target,
      onComplete,
      format = defaultFormat,
      getAnnouncement = defaultAnnouncement,
      variant = 'numeric',
      size = 96,
      strokeWidth = 6,
      id,
      className,
      nonce,
    } = props

    const ringId = hooks.useId()
    const targetMs = resolveTargetMs(target)

    const [remainingMs, setRemainingMs] = hooks.useState<number | null>(null)
    const [announcement, setAnnouncement] = hooks.useState('')
    const [reducedMotion, setReducedMotion] = hooks.useState(false)
    const totalMsRef = hooks.useRef<number | null>(null)
    const completedRef = hooks.useRef(false)
    const announcedMinuteRef = hooks.useRef<number | null>(null)

    hooks.useEffect(() => {
      if (typeof matchMedia !== 'function') return
      setReducedMotion(matchMedia('(prefers-reduced-motion: reduce)').matches)
    }, [])

    hooks.useEffect(() => {
      totalMsRef.current = null
      completedRef.current = false
      announcedMinuteRef.current = null

      const tick = (): boolean => {
        const remaining = Math.max(0, targetMs - Date.now())
        if (totalMsRef.current === null) totalMsRef.current = Math.max(remaining, 1)
        setRemainingMs(remaining)

        const currentMinute = Math.ceil(remaining / 60000)
        if (remaining <= 0 || currentMinute !== announcedMinuteRef.current) {
          announcedMinuteRef.current = currentMinute
          setAnnouncement(getAnnouncement(remaining))
        }

        if (remaining <= 0) {
          if (!completedRef.current) {
            completedRef.current = true
            onComplete?.()
          }
          return true
        }
        return false
      }

      if (tick()) return

      const intervalId = setInterval(() => {
        if (tick()) clearInterval(intervalId)
      }, TICK_INTERVAL_MS)

      return () => clearInterval(intervalId)
    }, [targetMs])

    // Backs the live region's own `liveRegionProps`-supplied `VISUALLY_HIDDEN_ATTR` marker — a
    // self-rendered `<style nonce={nonce}>` element, never an inline `style` attribute (see this
    // module's own top-of-file doc). Rendered whenever the live region itself is, never otherwise.
    const liveRegion = remainingMs === null ? null : [
      h('span', { key: 'live', ...liveRegionProps('polite') }, announcement),
      h('style', { key: 'live-style', nonce }, VISUALLY_HIDDEN_CSS),
    ]

    const valueText = remainingMs === null ? '' : format(remainingMs)
    const valueSpan = h('span', { key: 'value', 'aria-hidden': 'true' }, valueText)

    if (variant === 'ring') {
      const radius = (size - strokeWidth) / 2
      const circumference = 2 * Math.PI * radius
      const total = totalMsRef.current
      const progress = remainingMs === null || !total
        ? 1
        : Math.min(1, Math.max(0, remainingMs / total))
      const dashOffset = circumference * (1 - progress)

      const trackSelector = `[data-countdown-ring-id='${ringId}'][data-countdown-ring='track']`
      const progressSelector =
        `[data-countdown-ring-id='${ringId}'][data-countdown-ring='progress']`
      const ringCss = `${trackSelector}{stroke-width:${strokeWidth}px}` +
        `${progressSelector}{stroke-width:${strokeWidth}px;stroke-linecap:round;` +
        `stroke-dasharray:${circumference}px;stroke-dashoffset:${dashOffset}px;` +
        `transition:${reducedMotion ? 'none' : 'stroke-dashoffset 0.25s linear'}}`

      const ring = h(
        'svg',
        {
          key: 'ring',
          width: size,
          height: size,
          viewBox: `0 0 ${size} ${size}`,
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('style', { key: 'ring-style', nonce }, ringCss),
        h('circle', {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          fill: 'none',
          stroke: 'currentColor',
          opacity: 0.2,
          'data-countdown-ring-id': ringId,
          'data-countdown-ring': 'track',
        }),
        h('circle', {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          fill: 'none',
          stroke: 'currentColor',
          transform: `rotate(-90 ${size / 2} ${size / 2})`,
          'data-countdown-ring-id': ringId,
          'data-countdown-ring': 'progress',
        }),
      )

      return h(
        'span',
        { id, className, 'data-space-ui': 'countdown', 'data-variant': 'ring' },
        ring,
        valueSpan,
        liveRegion,
      )
    }

    return h(
      'span',
      { id, className, 'data-space-ui': 'countdown', 'data-variant': 'numeric' },
      valueSpan,
      liveRegion,
    )
  }
}
