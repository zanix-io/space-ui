import type { CreateElement } from 'typings/renderer.ts'
import { deriveStableCometId } from 'shared/stable-comet-id.ts'
import { resolveActiveNonce } from 'shared/active-nonce.ts'
import {
  buildOverlayCss,
  getOrInsertDynamicRule,
  removeDynamicRule,
} from 'shared/overlay-position-css.ts'
import type { RangeSliderBaseProps } from './types.ts'

/**
 * The static, non-dynamic part of this component's own positioning (`position: relative` on the
 * track, `position: absolute` on the fill and every handle) — the one-time layout setup every
 * instance needs regardless of its own current value, built ONCE at module scope, injected via a
 * `<style nonce={nonce}>` element instead of an inline `style` attribute (see
 * `RangeSliderCommonProps.nonce`'s own doc for the full CSP reasoning). The per-instance `left`/
 * `width` values are genuinely dynamic, unlike this — `createRangeSlider`'s own `initialPositionCss`
 * renders them into the SAME `<style>` element's initial text (server-renderable, since it's plain
 * arithmetic on props), then a CSSOM rule takes over once the client hydrates; see that function's
 * own doc below for the full reasoning.
 */
const RANGE_SLIDER_POSITION_CSS: string =
  buildOverlayCss('range-slider-track', { position: 'relative' }) +
  buildOverlayCss('range-slider-range', { position: 'absolute', top: 0, bottom: 0 }) +
  buildOverlayCss('range-slider-handle', { position: 'absolute' })

/** The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createRadioGroup}'s own `RadioGroupHooks` established.
 * `useLayoutEffect` is injected alongside `useEffect` for the same reason `Tooltip/render.ts`'s own
 * `TooltipHooks` already documents: React's and `preact/hooks`' real exports share the same name and
 * signature, so this stays a genuine renderer-agnostic binding. */
export type RangeSliderHooks = {
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useRef: <T>(initial: T) => { current: T }
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useLayoutEffect: (effect: () => void | (() => void), deps: unknown[]) => void
}

/** Which handle a drag/keyboard interaction currently targets — `'single'` for the one-handle
 * shape, `'min'`/`'max'` for the two-handle range shape's lower/upper handle respectively. */
type HandleKey = 'single' | 'min' | 'max'

/** Minimal structural shape both React's and Preact's own keyboard event satisfy — this module
 * never imports React or Preact, same reasoning `DatePicker/render.ts`'s own `DatePickerKeyEvent`
 * documents. */
type RangeSliderKeyEvent = {
  key: string
  preventDefault(): void
}

/** Minimal structural shape both React's and Preact's own pointer event satisfy. `currentTarget` is
 * deliberately `unknown` (never `EventTarget`) — this module never imports a DOM lib type either;
 * each call site casts it right before calling `.focus()`. */
type RangeSliderPointerEvent = {
  clientX: number
  preventDefault(): void
  stopPropagation(): void
  currentTarget: unknown
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi)
}

function roundToStep(value: number, min: number, step: number): number {
  if (step <= 0) return value
  return min + Math.round((value - min) / step) * step
}

function percentFor(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return clamp(((value - min) / (max - min)) * 100, 0, 100)
}

/**
 * The real implementation of `RangeSlider`, shared identically between the React and Preact
 * bindings — same `render.ts`-factory pattern `RadioGroup`/`Table` already establish. A real numeric
 * slider — never a pair of plain `<input type="number">` fields, never a row of discrete chip
 * buttons — rendering ONE handle (`role="slider"`) for the single-value shape
 * ({@linkcode RangeSliderSingleProps}) or TWO independent handles for the two-handle range shape
 * ({@linkcode RangeSliderRangeProps}), picked by which of `label`/`minLabel`+`maxLabel` the caller
 * provides — see `types.ts`'s own doc for the full discriminated shape.
 *
 * ## A real, standalone widget — not `Slider` (the carousel) renamed
 *
 * `Slider` already exists in this catalog, but it's the WAI-ARIA Carousel pattern
 * (`role="region"`/`aria-roledescription="carousel"`, one slide visible at a time, advanced by
 * arrows/dots/autoplay) — its own doc explicitly warns against ever giving it `role="slider"` (a
 * past regression already did, and was corrected). This component is the real thing that role
 * describes: a numeric range-input widget. No code or markup is shared between the two; they solve
 * genuinely unrelated problems that happen to share an everyday English word.
 *
 * Not a native `<input type="range">` either, even for the single-value shape — the two-handle range
 * shape has no native HTML equivalent at all (one `<input type="range">` element has exactly one
 * thumb), and this component's own contract needs ONE implementation covering both shapes identically
 * (same keyboard/drag/positioning code, same props shape) rather than switching to a native element
 * for one shape and a custom one for the other.
 *
 * ## Keyboard: the WAI-ARIA slider pattern, not roving tabindex
 *
 * Each handle is its own independently-focusable `role="slider"` element — `Tab` moves between the
 * two handles of a range the same way it moves between any two ordinary controls. Deliberately NOT
 * `shared/roving-focus.ts`'s roving-tabindex pattern, which is for a set of mutually-exclusive
 * triggers where exactly one is ever the current tab stop (`RadioGroup`/`Tabs`) — a range slider's
 * two handles are independent controls a user tabs between normally, each adjusted independently by
 * arrow keys while it holds focus, the WAI-ARIA APG's own "Slider (Multi-Thumb)" pattern.
 * `ArrowRight`/`ArrowUp` increments by `step`, `ArrowLeft`/`ArrowDown` decrements, `PageUp`/
 * `PageDown` jump by `pageStep`, `Home`/`End` jump to this handle's own current effective minimum/
 * maximum — which, for the range shape's lower handle, is the UPPER handle's own current value
 * (never past it), and vice versa for the upper handle, so the two handles can never cross.
 *
 * ## Pointer/touch drag: document-level listeners while dragging, never `setPointerCapture`
 *
 * A `pointerdown` on a handle starts dragging it, stopping the event from also reaching the track's
 * own `pointerdown` handler below, and moves real DOM focus onto it explicitly — calling
 * `preventDefault()` (needed to stop native text-selection/scroll-gesture behavior while dragging)
 * also suppresses the browser's own default focus-on-click behavior for a non-form element, so this
 * component has to do it itself. A `pointerdown` on the track itself (not a handle) jumps the
 * NEAREST handle to that position and starts dragging it from there — the same "click the track to
 * jump" behavior a native `<input type="range">` gives for free. Tracking then continues via
 * `pointermove`/`pointerup`/`pointercancel` listeners on `document` for as long as `dragging` is
 * set, rather than `setPointerCapture` on the handle itself — that API isn't universally available
 * across every DOM implementation this package's own tests run against, and a document-level
 * listener already gives the same "keep tracking even once the pointer leaves the handle/track"
 * behavior pointer capture exists for. The move handler reads every value it needs (the current
 * tuple, `min`/`max`/`step`, `onValueChange`) through a ref updated every render, never a stale
 * closure — the same `useCloseOnOutside`-established idiom for a listener whose subscribe/
 * unsubscribe should only re-run when `dragging` itself changes, not on every render while a drag is
 * already in progress.
 *
 * ## Per-instance handle/fill positioning: a CSSOM rule, never inline `style`
 *
 * A handle's position (and the filled portion of the track) is a continuous 0–100% value with no
 * finite, precomputable set of cases — unlike `Drawer`'s `DRAWER_SIDE_STYLE`/`Modal`'s
 * `MODAL_Z_INDEX` (a handful of fixed CSS rules, one per enum value), so their "one static rule per
 * case" fix doesn't apply here. It also changes on every drag/keyboard update — far more frequently
 * than `Avatar`'s `width`/`height` or `ProgressBar`'s `height`/duration, which only change rarely —
 * so this component follows `Tooltip`/`Popover`'s own precedent instead (`shared/
 * overlay-position-css.ts`'s `getOrInsertDynamicRule`/`removeDynamicRule`): a `<style nonce={nonce}>`
 * element carries the static, module-level {@linkcode RANGE_SLIDER_POSITION_CSS} as its initial
 * text, immediately followed by `initialPositionCss` — the SAME `left`/`width` the dynamic rule
 * below would apply, computed as plain server-renderable CSS text so the very first paint (SSR,
 * before any client script runs) already shows the handle/fill at their real position instead of
 * their unstyled default spot. Once the client hydrates, `getOrInsertDynamicRule` inserts one empty
 * per-instance rule per moving part (the fill, and each handle) and mutates it directly
 * (`CSSStyleRule.style.setProperty('left', ...)`) on every later value change — never a `<style>`
 * text rebuild every render, and never an inline `style` attribute either (a real, confirmed CSP
 * violation under a nonce-based `style-src`; see that module's own doc for the full mechanism). A
 * dynamically-inserted rule always lands after `initialPositionCss` in the stylesheet
 * (`sheet.insertRule`'s own index argument appends), so it wins the cascade by source order for the
 * same selector the instant it exists — the same value in the common case, so hydration itself
 * causes no visible change either. Without a matching nonce, the `<style>` element itself is what a
 * strict CSP blocks — the WHOLE element, `initialPositionCss` included — so every handle falls back
 * to its unstyled default spot and the dynamic rule never lands either, a real, documented
 * fallback, never a crash.
 *
 * `data-range-slider-id` (the attribute scoping every per-instance CSSOM rule to THIS instance) is
 * `deriveStableCometId`'s own output (`shared/stable-comet-id.ts`), never the renderer's bare
 * `useId()` — this component has zero `@zanix/space` dependency (ships from the root barrel), so it
 * can end up composed inside some Comet's own isolated hydration root (present or future) just as
 * easily as `Avatar`/`Menu`/`DatePicker` already can — see `stable-comet-id.ts`'s own doc for the
 * full hydration-root hazard `useId()` would reintroduce here. Seeded from this instance's own
 * accessible-name prop(s) (`label`, or `minLabel`+`maxLabel`) plus `min`/`max` — all already
 * identical between the server render and the client hydration, since they're plain props; two
 * instances sharing the exact same seed collide on id, the same narrow, accepted residual `Menu`'s/
 * `Avatar`'s own docs already accept.
 *
 * ## No separate live-region announcement
 *
 * Unlike `Slider` (a carousel, whose active-slide changes are NOT on the currently-focused element's
 * own attributes — the real reason it needs its own visually-hidden live region) or `Countdown` (a
 * value that changes on its own, with nothing focused at all), this component's value changes always
 * land on `aria-valuenow`/`aria-valuetext` of whichever handle currently HOLDS real DOM focus — the
 * WAI-ARIA slider pattern's own built-in announcement mechanism, since assistive technology already
 * announces an attribute change on the focused element itself. A second, redundant live region here
 * would only double-announce every change, not add one this component is missing.
 */
export function createRangeSlider<E>(
  h: CreateElement<E>,
  hooks: RangeSliderHooks,
): (props: RangeSliderBaseProps) => E {
  return function RangeSlider(props: RangeSliderBaseProps): E {
    const {
      min = 0,
      max = 100,
      step = 1,
      pageStep = step * 10,
      disabled = false,
      formatValue,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      id,
      className,
      nonce: nonceProp,
      label,
      minLabel,
      maxLabel,
      value: controlledValue,
      defaultValue,
      onValueChange,
    } = props
    const isRange = minLabel !== undefined
    const nonce = resolveActiveNonce(nonceProp)
    // The two shapes' `onValueChange` differ only in their argument's own arity (`number` vs.
    // `[number, number]`) — always called with the shape matching `isRange`, which TypeScript can't
    // verify across the union on its own. A single, narrow, documented cast, same tolerance
    // `RadioGroup/render.ts`'s own `hAny` cast already has for an analogous "provably safe at this
    // exact call site, not generally" case.
    const emitChange = onValueChange as ((value: number | [number, number]) => void) | undefined

    const isControlled = controlledValue !== undefined
    // Normalized (clamped + step-rounded) the same way every later committed value is — an
    // out-of-bounds/off-step `defaultValue` (e.g. `0` when `min={10}`) is a real, plausible caller
    // mistake, not something only a drag/keyboard interaction needs to guard against.
    const normalize = (raw: number) => clamp(roundToStep(raw, min, step), min, max)
    const initialTuple: [number, number] = isRange
      ? (() => {
        const seed = (defaultValue as [number, number] | undefined) ?? [min, max]
        const lower = normalize(seed[0])
        return [lower, clamp(normalize(seed[1]), lower, max)]
      })()
      : [normalize((defaultValue as number | undefined) ?? min), max]
    const [internalValue, setInternalValue] = hooks.useState<[number, number]>(initialTuple)
    const valueTuple: [number, number] = isControlled
      ? (isRange ? (controlledValue as [number, number]) : [controlledValue as number, max])
      : internalValue

    const trackRef = hooks.useRef<HTMLElement | null>(null)
    const [dragging, setDragging] = hooks.useState<HandleKey | null>(null)

    // Read fresh on every pointermove/keydown call, never a stale closure captured once — same
    // idiom `useCloseOnOutside`'s own `onCloseRef` establishes.
    const latestRef = hooks.useRef({
      valueTuple,
      min,
      max,
      step,
      isRange,
      isControlled,
      emitChange,
    })
    latestRef.current = { valueTuple, min, max, step, isRange, isControlled, emitChange }

    const setValue = (key: HandleKey, rawNext: number) => {
      const current = latestRef.current
      const rounded = clamp(
        roundToStep(rawNext, current.min, current.step),
        current.min,
        current.max,
      )
      let next: [number, number]
      if (current.isRange) {
        next = key === 'max'
          ? [current.valueTuple[0], clamp(rounded, current.valueTuple[0], current.max)]
          : [clamp(rounded, current.min, current.valueTuple[1]), current.valueTuple[1]]
      } else {
        next = [rounded, current.valueTuple[1]]
      }
      if (next[0] === current.valueTuple[0] && next[1] === current.valueTuple[1]) return
      if (!current.isControlled) setInternalValue(next)
      current.emitChange?.(current.isRange ? next : next[0])
    }

    const idSeed = isRange
      ? `range:${minLabel}:${maxLabel}:${min}:${max}`
      : `single:${label}:${min}:${max}`
    const sliderId = deriveStableCometId(idSeed, 'range-slider')

    const valueFromClientX = (clientX: number): number => {
      const trackEl = trackRef.current
      const current = latestRef.current
      if (!trackEl) return current.valueTuple[0]
      const rect = trackEl.getBoundingClientRect()
      const ratio = rect.width === 0 ? 0 : clamp((clientX - rect.left) / rect.width, 0, 1)
      return clamp(
        roundToStep(current.min + ratio * (current.max - current.min), current.min, current.step),
        current.min,
        current.max,
      )
    }

    const startDrag = (key: HandleKey, target?: unknown) => {
      setDragging(key)
      const el = (target ?? trackRef.current?.querySelector(
        `[data-range-slider-handle='${key}']`,
      )) as { focus?: () => void } | null | undefined
      el?.focus?.()
    }

    const handleTrackPointerDown = (event: RangeSliderPointerEvent) => {
      if (disabled) return
      event.preventDefault()
      const current = latestRef.current
      const next = valueFromClientX(event.clientX)
      const key: HandleKey = current.isRange
        ? (Math.abs(next - current.valueTuple[0]) <= Math.abs(next - current.valueTuple[1])
          ? 'min'
          : 'max')
        : 'single'
      setValue(key, next)
      startDrag(key)
    }

    const handleHandlePointerDown = (key: HandleKey) => (event: RangeSliderPointerEvent) => {
      if (disabled) return
      event.preventDefault()
      event.stopPropagation()
      startDrag(key, event.currentTarget)
    }

    hooks.useEffect(() => {
      if (dragging === null) return
      const handlePointerMove = (event: PointerEvent) =>
        setValue(dragging, valueFromClientX(event.clientX))
      const stopDragging = () => setDragging(null)
      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', stopDragging)
      document.addEventListener('pointercancel', stopDragging)
      return () => {
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', stopDragging)
        document.removeEventListener('pointercancel', stopDragging)
      }
    }, [dragging])

    const handleKeyDown = (key: HandleKey) => (event: RangeSliderKeyEvent) => {
      if (disabled) return
      const current = latestRef.current
      const idx = key === 'max' ? 1 : 0
      const value = current.valueTuple[idx]
      const lowerBound = current.isRange && key === 'max' ? current.valueTuple[0] : current.min
      const upperBound = current.isRange && key === 'min' ? current.valueTuple[1] : current.max
      let next: number | null = null
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        next = clamp(value + current.step, lowerBound, upperBound)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        next = clamp(value - current.step, lowerBound, upperBound)
      } else if (event.key === 'PageUp') next = clamp(value + pageStep, lowerBound, upperBound)
      else if (event.key === 'PageDown') next = clamp(value - pageStep, lowerBound, upperBound)
      else if (event.key === 'Home') next = lowerBound
      else if (event.key === 'End') next = upperBound
      if (next === null || next === value) return
      event.preventDefault()
      setValue(key, next)
    }

    // --- per-instance CSSOM positioning — see this function's own doc above -----------------------

    const styleElRef = hooks.useRef<HTMLStyleElement | null>(null)
    const rangeRuleRef = hooks.useRef<CSSStyleRule | null>(null)
    const minRuleRef = hooks.useRef<CSSStyleRule | null>(null)
    const maxRuleRef = hooks.useRef<CSSStyleRule | null>(null)
    const singleRuleRef = hooks.useRef<CSSStyleRule | null>(null)

    const rangeSelector = `[data-space-ui='range-slider-range'][data-range-slider-id='${sliderId}']`
    const minSelector =
      `[data-space-ui='range-slider-handle'][data-range-slider-id='${sliderId}'][data-range-slider-handle='min']`
    const maxSelector =
      `[data-space-ui='range-slider-handle'][data-range-slider-id='${sliderId}'][data-range-slider-handle='max']`
    const singleSelector =
      `[data-space-ui='range-slider-handle'][data-range-slider-id='${sliderId}'][data-range-slider-handle='single']`

    // Computed on every render (plain arithmetic on props/state, no DOM access) — unlike the CSSOM
    // rules below, this runs during SSR too, which is what lets `initialPositionCss` reflect the
    // real value on the very first paint.
    const startPercent = isRange ? percentFor(valueTuple[0], min, max) : 0
    const endPercent = isRange
      ? percentFor(valueTuple[1], min, max)
      : percentFor(valueTuple[0], min, max)
    // `lowerPercent` is the range shape's own lower handle, or simply THE handle's own position for
    // the single shape; `upperPercent` is only ever meaningful when `isRange` (`valueTuple[1]` stays
    // pinned to `max` otherwise, per `valueTuple`'s own definition above).
    const lowerPercent = percentFor(valueTuple[0], min, max)
    const upperPercent = percentFor(valueTuple[1], min, max)

    // `getOrInsertDynamicRule`'s own CSSOM mutation (below) only ever runs once a `useLayoutEffect`
    // fires — never during SSR (`styleEl.sheet` doesn't exist yet) — so the handle/fill otherwise
    // sit at their unstyled default position (the track's own top-left corner) through the whole
    // first paint, only snapping to the real spot once the client hydrates: a real, confirmed jump
    // on every load, worse the slower the client script takes to run. This string carries the exact
    // same `left`/`width` the effect below would apply, as plain server-renderable CSS text inside
    // the SAME `<style>` element SSR already emits — so the first paint is already correct. Once
    // hydration inserts the dynamic rule (via `sheet.insertRule`, always appended after whatever
    // text the element started with), it wins the cascade by source order for the same selector —
    // same value in the common case, so this never causes its own flash either.
    const initialPositionCss = [
      `${rangeSelector}{left:${startPercent}%;width:${Math.max(0, endPercent - startPercent)}%}`,
      isRange
        ? `${minSelector}{left:${lowerPercent}%}\n${maxSelector}{left:${upperPercent}%}`
        : `${singleSelector}{left:${lowerPercent}%}`,
    ].join('\n')

    // Inserted once per real mount — `sliderId`/the selectors above are stable for this instance's
    // whole lifetime (derived from props that don't change shape after mount), deliberately not a
    // dependency, same discipline `Tooltip/render.ts`'s own `dynamicSelector` comment documents.
    hooks.useLayoutEffect(() => {
      const styleEl = styleElRef.current
      if (!styleEl) return
      getOrInsertDynamicRule(styleEl, rangeRuleRef, rangeSelector)
      if (isRange) {
        getOrInsertDynamicRule(styleEl, minRuleRef, minSelector)
        getOrInsertDynamicRule(styleEl, maxRuleRef, maxSelector)
      } else {
        getOrInsertDynamicRule(styleEl, singleRuleRef, singleSelector)
      }
      return () => {
        removeDynamicRule(styleEl, rangeRuleRef)
        removeDynamicRule(styleEl, minRuleRef)
        removeDynamicRule(styleEl, maxRuleRef)
        removeDynamicRule(styleEl, singleRuleRef)
      }
    }, [])

    // Applies the CURRENT `left`/`width` on every value change — `useLayoutEffect`, not `useEffect`,
    // so a drag never visibly flashes/jumps a frame behind, same reasoning `Tooltip/render.ts`'s own
    // position-applying effect documents. Reuses `startPercent`/`endPercent`/`lowerPercent`/
    // `upperPercent` from this same render rather than recomputing them — this effect's own deps
    // already match exactly what those depend on.
    hooks.useLayoutEffect(() => {
      rangeRuleRef.current?.style.setProperty('left', `${startPercent}%`)
      rangeRuleRef.current?.style.setProperty('width', `${Math.max(0, endPercent - startPercent)}%`)
      if (isRange) {
        minRuleRef.current?.style.setProperty('left', `${lowerPercent}%`)
        maxRuleRef.current?.style.setProperty('left', `${upperPercent}%`)
      } else {
        singleRuleRef.current?.style.setProperty('left', `${lowerPercent}%`)
      }
    }, [valueTuple[0], valueTuple[1], min, max, isRange])

    const handles: { key: HandleKey; value: number; min: number; max: number; label: string }[] =
      isRange
        ? [
          { key: 'min', value: valueTuple[0], min, max: valueTuple[1], label: minLabel as string },
          { key: 'max', value: valueTuple[1], min: valueTuple[0], max, label: maxLabel as string },
        ]
        : [{ key: 'single', value: valueTuple[0], min, max, label: label as string }]

    return h(
      'div',
      { id, className, 'data-space-ui': 'range-slider', 'data-range-slider-id': sliderId },
      h(
        'style',
        { key: 'style', nonce, ref: styleElRef },
        RANGE_SLIDER_POSITION_CSS + '\n' + initialPositionCss,
      ),
      h(
        'div',
        {
          key: 'track',
          ref: trackRef,
          'data-space-ui': 'range-slider-track',
          onPointerDown: handleTrackPointerDown,
        },
        h('div', {
          key: 'range',
          'data-space-ui': 'range-slider-range',
          'data-range-slider-id': sliderId,
        }),
        handles.map((handle) =>
          h('div', {
            key: handle.key,
            role: 'slider',
            tabIndex: disabled ? -1 : 0,
            'aria-label': handle.label,
            'aria-valuemin': handle.min,
            'aria-valuemax': handle.max,
            'aria-valuenow': handle.value,
            'aria-valuetext': formatValue ? formatValue(handle.value) : undefined,
            'aria-disabled': disabled || undefined,
            'aria-invalid': ariaInvalid,
            'aria-describedby': ariaDescribedBy,
            'data-space-ui': 'range-slider-handle',
            'data-range-slider-id': sliderId,
            'data-range-slider-handle': handle.key,
            'data-dragging': dragging === handle.key || undefined,
            onKeyDown: handleKeyDown(handle.key),
            onPointerDown: handleHandlePointerDown(handle.key),
          })
        ),
      ),
    )
  }
}
