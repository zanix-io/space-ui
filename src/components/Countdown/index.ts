import { useEffect, useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import { createCountdown } from './render.ts'
import type { CountdownBaseProps } from './types.ts'

export type { CountdownBaseProps, CountdownVariant } from './types.ts'

/** {@linkcode CountdownBaseProps} — nothing extra for the React binding. */
export type CountdownProps = CountdownBaseProps

/**
 * A real-time countdown toward a wall-clock instant — distinct from `Counter` (a fixed-duration
 * count-UP reveal animation, a genuinely different contract; not reused or extended here). Real
 * implementation shared with the Preact binding via `render.ts`'s own `createCountdown` (see that
 * file's own doc for the full contract — wall-clock anchoring across tab throttling, the
 * `onComplete`-exactly-once latch, the throttled `aria-live` announcements, `prefers-reduced-motion`
 * handling for the `'ring'` variant); import from `@zanix/space-ui/preact` instead for the Preact
 * one, same contract, same rendered behavior.
 *
 * `data-space-ui="countdown"` on the root, with `data-variant` reflecting
 * {@linkcode CountdownBaseProps.variant} — same convention `Card`'s own `data-align`/`data-stacked`
 * already establish for a component whose rendered shape branches on a prop.
 *
 * @example
 * ```tsx
 * <Countdown target={new Date(Date.now() + 90_000)} onComplete={() => resendOtp()} />
 * <Countdown
 *   target={saleEndsAt}
 *   variant="ring"
 *   format={(ms) => `${Math.ceil(ms / 1000)}s`}
 * />
 * ```
 */
export const Countdown: (props: CountdownProps) => ReactElement = createCountdown(
  createElementWithNonceHydrationFix as unknown as CreateElement<ReactElement>,
  { useState, useEffect, useRef, useId },
)
