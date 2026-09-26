import { h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createRangeSlider } from './render.ts'
import type { RangeSliderBaseProps } from './types.ts'

export type {
  RangeSliderBaseProps,
  RangeSliderCommonProps,
  RangeSliderRangeProps,
  RangeSliderSingleProps,
} from './types.ts'

/** {@linkcode RangeSliderBaseProps} — nothing extra for the Preact binding. */
export type RangeSliderProps = RangeSliderBaseProps

/**
 * A real numeric slider input — see `index.ts`'s own doc for the full contract, not repeated here.
 * Preact binding, same props, same rendered markup; import from `@zanix/space-ui` (no subpath) for
 * the React one.
 */
export const RangeSlider: (props: RangeSliderProps) => VNode = createRangeSlider<VNode>(
  h as unknown as CreateElement<VNode>,
  { useState, useRef, useEffect, useLayoutEffect },
)
