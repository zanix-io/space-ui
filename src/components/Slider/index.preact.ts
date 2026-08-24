import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createSlider } from './render.ts'
import type { SliderBaseProps } from './types.ts'

/** {@linkcode SliderBaseProps} plus the slides themselves, passed as `children`. */
export type SliderProps = SliderBaseProps & { children: ComponentChildren }

/**
 * A carousel: one slide visible at a time, advanced by arrows, dots, keyboard, or autoplay. Preact
 * binding — see `index.ts`'s own doc for the full behavioral contract (no store, the Carousel ARIA
 * pattern, the never-remount-while-cached cache, the CSS crossfade contract, `loop`/
 * `autoPlayInterval` separated, the Pause/Play control vs. hover, keyboard, `aria-live`, dots) — not
 * repeated here. Same contract, same rendered behavior, real implementation shared with the React
 * binding via `render.ts`'s own `createSlider` (hook injection — see that file's own doc for why
 * that's sound) — never `preact/compat`.
 */
export const Slider: (props: SliderProps) => VNode = createSlider<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useEffect, useRef, useState },
)
