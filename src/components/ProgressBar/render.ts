import type { CreateElement } from 'typings/renderer.ts'
import type { ProgressBarProps } from './types.ts'

/**
 * A determinate (`timeout`) or indeterminate loading indicator — two nested elements: an outer
 * track (`data-space-ui="progress-bar"`, sized by `height`) and an inner fill. No hooks, no state,
 * no timers of any kind — every visual behavior (the actual animation) is real CSS, driven by
 * plain data this component exposes on the DOM, never computed or scheduled in JavaScript.
 *
 * Accessibility: decorative by default (`aria-hidden` on the track), same convention `Icon.label`
 * already establishes — passing `label` switches it to `role="progressbar"` with `aria-valuemin`/
 * `aria-valuemax` bounds declared. `aria-valuenow` is never set on either path: this component has
 * no JS ticking a real numeric value at any instant (the fill's actual position is a pure CSS
 * animation), so reporting one would be fabricated, not honest. Per WAI-ARIA, a `progressbar` with
 * no `aria-valuenow` is the correct, standard way to mark it indeterminate — true for both the
 * `timeout` and no-`timeout` cases here, regardless of which visual animation is playing.
 *
 * The fill element carries `data-timeout` (present, with the real millisecond value, whenever
 * `timeout` is set) and a `--space-ui-progress-duration` CSS custom property with that same value
 * — the only per-instance data this component has that an animation actually needs. It does NOT
 * set an `animation` CSS property itself, and does not hardcode or assume any specific keyframe
 * name: doing either would mean this component assuming a specific external stylesheet is present,
 * which contradicts this whole package's own "no component imports a stylesheet, generates a class
 * name, or assumes any styling tool is present" principle. With no CSS at all applied, this
 * component is fully valid, inert markup — a track and a fill with zero visible size until styled,
 * the same "correct but invisible until you add CSS" posture every other component here already
 * has.
 *
 * `shared/behavior.css` (this package's own optional scaffold template, never imported by any
 * runtime code) already carries the two keyframes this shape was designed for —
 * `space-ui-progress-bar` (a one-shot width drain, 100% → 0%) and `space-ui-infinite-progress` (a
 * looping sweep) — and now also carries the actual rules that key off `data-space-ui` and
 * `data-timeout` to apply them, plus a `prefers-reduced-motion: reduce` override that removes the
 * animation entirely rather than offering a "safer" motion alternative, since neither variant has
 * one. This is genuinely optional: nothing here requires that file, or any CSS at all, to function
 * correctly as inert markup — a project that never scaffolds it, or replaces it entirely, loses
 * nothing this component itself owns.
 */
export function createProgressBar<E>(h: CreateElement<E>): (props: ProgressBarProps) => E {
  return function ProgressBar(props: ProgressBarProps): E {
    const { timeout, height = 7, label, id, className } = props

    return h(
      'div',
      {
        id,
        className,
        'data-space-ui': 'progress-bar',
        style: { height: typeof height === 'number' ? `${height}px` : height },
        role: label ? 'progressbar' : undefined,
        'aria-label': label,
        'aria-valuemin': label ? 0 : undefined,
        'aria-valuemax': label ? 100 : undefined,
        'aria-hidden': label ? undefined : true,
      },
      h('div', {
        'data-timeout': timeout,
        style: timeout ? { '--space-ui-progress-duration': `${timeout}ms` } : undefined,
      }),
    )
  }
}
