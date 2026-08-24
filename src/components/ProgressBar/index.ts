import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createProgressBar } from './render.ts'
import type { ProgressBarProps } from './types.ts'

/**
 * A determinate (`timeout`) or indeterminate loading indicator — headless, no animation of its
 * own: this component renders plain, styleable markup and exposes the data an optional stylesheet
 * (this package's own `shared/behavior.css` scaffold, or a consumer's own CSS) needs to actually
 * animate it. Decorative (`aria-hidden`) by default; pass `label` for an accessible
 * `role="progressbar"`. See {@linkcode ProgressBarProps}'s own doc for the full contract, and
 * `render.ts`'s own doc for the full accessibility/CSS-wiring reasoning.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <ProgressBar />
 * <ProgressBar timeout={5000} label="Auto-dismissing in 5 seconds" />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const ProgressBar: (props: ProgressBarProps) => ReactElement = createProgressBar(
  createElement as unknown as CreateElement<ReactElement>,
)
