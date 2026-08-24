import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createAlert } from './render.ts'
import type { AlertProps } from './types.ts'

/**
 * A persistent, visible inline message banner — `role="alert"` or `role="status"` depending on
 * `politeness` — see `render.ts`'s own doc for the full contract. React binding — import from
 * `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Alert politeness="polite">Saved successfully.</Alert>
 * ```
 */
// Same `createElement`/`h` overload-set cast `Icon/index.ts` already needs and explains in full.
export const Alert: (props: AlertProps) => ReactElement = createAlert(
  createElement as unknown as CreateElement<ReactElement>,
)
