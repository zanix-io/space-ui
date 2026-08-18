import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createLink } from './render.ts'
import type { LinkProps } from './types.ts'

/**
 * A plain `<a>` with sensible external-link attributes — `target="_blank"` and a safe `rel` when
 * `external` is set, nothing extra otherwise; `rel` is itself overridable (`'nofollow'`, pagination
 * `'next'`/`'prev'`, ...). `onClick` is optional, for the real cases that need it alongside
 * navigation (analytics, confirm-before-leaving) — it never replaces navigation. No
 * internal-routing special case: `@zanix/space`'s own Orbit navigation intercepts plain anchor
 * clicks without an opt-in component, so this never needs to know whether `href` is internal or
 * external beyond the attributes it renders.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Link href="https://github.com/zanix-io" external>GitHub</Link>
 * <Link href="/sponsored" rel="sponsored nofollow">Our partner</Link>
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Link: (props: LinkProps) => ReactElement = createLink(
  createElement as unknown as CreateElement<ReactElement>,
)
