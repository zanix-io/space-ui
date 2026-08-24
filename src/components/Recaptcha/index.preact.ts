import { h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useScriptLoader } from 'shared/use-script-loader.preact.ts'
import { createRecaptcha } from './render.ts'
import type { RecaptchaProps } from './types.ts'

/**
 * Google reCAPTCHA v2 (checkbox or invisible) and v3 (score-based) — Preact binding, see `index.ts`'s
 * own doc for the full behavioral contract (the three modes, SSR/hydration, CSP, the two separate
 * error sources, real end-to-end usage examples) — not repeated here. Same contract, same rendered
 * behavior, real implementation shared with the React binding via `render.ts`'s own `createRecaptcha`
 * (hook injection — see that file's own doc for why that's sound) — never `preact/compat`.
 */
export const Recaptcha: (props: RecaptchaProps) => VNode = createRecaptcha<VNode>(
  h as unknown as CreateElement<VNode>,
  { useEffect, useRef, useState, useScriptLoader },
)
