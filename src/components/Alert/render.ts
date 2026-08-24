import type { CreateElement } from 'typings/renderer.ts'
import type { AlertProps } from './types.ts'

/**
 * The real implementation of `Alert`, shared identically between the React and Preact bindings —
 * same stateless factory pattern `Icon/render.ts`/`VisuallyHidden/render.ts` already establish.
 *
 * A persistent, VISIBLE inline message banner — `role="alert"`/`role="status"` (via `politeness`),
 * both implicit live regions on their own, no explicit `aria-live` needed. Deliberately does NOT
 * reuse `shared/live-region.ts` — that module's own `VISUALLY_HIDDEN_STYLE` is for announcement-only
 * regions no one needs to SEE (`Slider`'s "Slide N of Total"); `Alert` is the opposite case, a
 * banner meant to be visible on screen, not hidden.
 *
 * No `variant`/severity prop (info/success/warning/error) — that's a purely visual distinction
 * with no ARIA backing (`politeness` is the one prop that maps to a real semantic difference,
 * `role="alert"` vs `role="status"`), fully achievable already via `className` without inventing
 * new API surface, same "no unrequested styling opinions" discipline every other component here
 * has.
 *
 * One real caveat, not solved here: some screen readers only reliably announce a `role="alert"`
 * element when it's added to the DOM as a genuinely NEW addition (e.g. mounted after initial page
 * load) — the same content already present in the very first SSR HTML, before any AT has started
 * scanning the page, may not announce on that very first load. `space-ui` never makes client-only
 * render-time decisions about when content mounts, so this is a real, documented characteristic of
 * the pattern itself, not a bug this component tries to paper over.
 */
export function createAlert<E>(h: CreateElement<E>): (props: AlertProps) => E {
  return function Alert({ children, politeness = 'assertive', id, className }: AlertProps): E {
    return h(
      'div',
      {
        id,
        className,
        role: politeness === 'assertive' ? 'alert' : 'status',
        'data-space-ui': 'alert',
      },
      children,
    )
  }
}
