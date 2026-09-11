import type { CreateElement } from 'typings/renderer.ts'
import { VISUALLY_HIDDEN_ATTR, VISUALLY_HIDDEN_CSS } from 'shared/live-region.ts'
import type { VisuallyHiddenProps } from './types.ts'

/**
 * The real implementation of `VisuallyHidden`, shared identically between the React and Preact
 * bindings (`index.ts`/`index.preact.ts`) — same stateless factory pattern `Icon/render.ts` already
 * establishes; see that file's own doc for why this pattern works for markup this simple.
 *
 * This component exists for the broader case beyond live announcements: any content that should
 * reach assistive technology without a visible on-screen presence (an icon-only control's
 * accessible label spelled out as real text, a skip link's destination description, a unit/currency
 * symbol read aloud but not shown redundantly) — not just `aria-live` regions.
 *
 * Carries `data-space-ui="visually-hidden"` — same inert, semver-protected identity-hook convention
 * every other component here has, no CSS shipped, nothing here reads or reacts to it. The actual
 * clip-and-collapse styling is `shared/live-region.ts`'s own `VISUALLY_HIDDEN_ATTR`/
 * `VISUALLY_HIDDEN_CSS` pair — applied via a self-rendered `<style nonce={nonce}>` element, never
 * an inline `style` attribute (a real, confirmed CSP violation under a nonce-based `style-src` this
 * fixes — see `VisuallyHiddenProps.nonce`'s own doc).
 *
 * Always a `<span>` — no polymorphic "render as a different element" option, since nothing in this
 * package has that pattern anywhere else and no evidence has asked for one here either.
 */
export function createVisuallyHidden<E>(h: CreateElement<E>): (props: VisuallyHiddenProps) => E {
  return function VisuallyHidden({ children, id, className, nonce }: VisuallyHiddenProps): E {
    return h(
      'span',
      { id, className, [VISUALLY_HIDDEN_ATTR]: '', 'data-space-ui': 'visually-hidden' },
      h('style', { key: 'style', nonce }, VISUALLY_HIDDEN_CSS),
      children,
    )
  }
}
