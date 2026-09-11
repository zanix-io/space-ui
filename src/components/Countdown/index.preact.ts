import { h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useId, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createCountdown } from './render.ts'
import type { CountdownBaseProps } from './types.ts'

export type { CountdownBaseProps, CountdownVariant } from './types.ts'

/** {@linkcode CountdownBaseProps} — nothing extra for the Preact binding. */
export type CountdownProps = CountdownBaseProps

/**
 * A real-time countdown toward a wall-clock instant — see `index.ts`'s own doc for the full
 * contract (wall-clock anchoring, `onComplete`-exactly-once, throttled `aria-live` announcements,
 * `prefers-reduced-motion` handling for `'ring'`), not repeated here. Preact binding, same props,
 * same rendered behavior; import from `@zanix/space-ui` (no subpath) for the React one.
 */
export const Countdown: (props: CountdownProps) => VNode = createCountdown(
  h as unknown as CreateElement<VNode>,
  { useState, useEffect, useRef, useId },
)
