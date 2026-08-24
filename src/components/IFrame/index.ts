import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createIFrame } from './render.ts'
import type { IFrameProps } from './types.ts'

/**
 * A real, standalone `<iframe>` primitive — headless, no styles of its own. `title` is required
 * (a real, common accessibility gap the legacy `IFrame` allowed). `loading="lazy"` is
 * browser-native, no `IntersectionObserver` involved. See {@linkcode IFrameProps}'s own doc for
 * the full contract, and `render.ts`'s own doc for what's kept/changed/dropped from the legacy
 * `zjs-react-components` `IFrame`.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <IFrame src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Song title" allowFullscreen />
 * <IFrame src="https://maps.example.com/embed" title="Store location" loading="lazy" />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const IFrame: (props: IFrameProps) => ReactElement = createIFrame(
  createElement as unknown as CreateElement<ReactElement>,
)
