import { h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createCounter } from './render.ts'
import type { CounterProps } from './types.ts'

/**
 * A number that animates from `0` up to {@linkcode CounterProps.target} the first time it becomes
 * visible, and never again. Preact binding — see `index.ts`'s own doc for the full behavioral
 * contract (reveal-once, no `Lazy`/`LayoutContainer`, SSR/pre-intersection `null`, the fixed
 * `aria-label`, `format` instead of an implicit locale, exact final value, real
 * `requestAnimationFrame` cleanup) — not repeated here. Same contract, same rendered behavior, real
 * implementation shared with the React binding via `render.ts`'s own `createCounter` (hook
 * injection, including real `useEffect`/`useRef` usage — see that file's own doc for why that's
 * sound) — never `preact/compat`.
 *
 * @example
 * ```ts
 * Counter({ target: 27_800, duration: 1000, prefix: '$' })
 * ```
 */
export const Counter: (props: CounterProps) => VNode = createCounter<VNode>(
  h as unknown as CreateElement<VNode>,
  { useEffect, useRef, useState },
)
