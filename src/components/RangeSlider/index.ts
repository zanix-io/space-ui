import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import { createRangeSlider } from './render.ts'
import type { RangeSliderBaseProps } from './types.ts'

export type {
  RangeSliderBaseProps,
  RangeSliderCommonProps,
  RangeSliderRangeProps,
  RangeSliderSingleProps,
} from './types.ts'

/** {@linkcode RangeSliderBaseProps} — nothing extra for the React binding. */
export type RangeSliderProps = RangeSliderBaseProps

/**
 * A real numeric slider input — a single draggable handle (`value: number`) or a two-handle range
 * (`value: [number, number]`), picked at the type level by which of `label`/`minLabel`+`maxLabel` is
 * given. Real implementation shared with the Preact binding via `render.ts`'s own `createRangeSlider`
 * (see that file's own doc for the full contract: keyboard, pointer/touch drag, per-instance CSSOM
 * positioning); import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same
 * rendered behavior.
 *
 * Genuinely unrelated to this catalog's own `Slider` (a carousel — see that component's own doc for
 * why it's deliberately never given `role="slider"`); this is the real WAI-ARIA slider widget that
 * role describes. `data-space-ui="range-slider"` on the root, `"range-slider-track"` on the track,
 * `"range-slider-range"` on the filled portion, `"range-slider-handle"` on each handle (also
 * carrying `data-range-slider-handle="min"|"max"|"single"` to tell which). Zero `@zanix/space`
 * dependency, ships from the root barrel.
 *
 * @example
 * ```tsx
 * // Single value — a distance/radius picker
 * <RangeSlider
 *   label="Search radius"
 *   min={0} max={100} step={1}
 *   value={radiusKm}
 *   onValueChange={setRadiusKm}
 *   formatValue={(v) => `${v} km`}
 * />
 *
 * // Two-handle range — an age range
 * <RangeSlider
 *   minLabel="Minimum age" maxLabel="Maximum age"
 *   min={18} max={80} step={1}
 *   value={ageRange}
 *   onValueChange={setAgeRange}
 *   formatValue={(v) => `${v} years`}
 * />
 * ```
 */
export const RangeSlider: (props: RangeSliderProps) => ReactElement = createRangeSlider<
  ReactElement
>(
  createElementWithNonceHydrationFix as unknown as CreateElement<ReactElement>,
  { useState, useRef, useEffect, useLayoutEffect },
)
