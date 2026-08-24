import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createVisuallyHidden } from './render.ts'
import type { VisuallyHiddenProps } from './types.ts'

/**
 * Hides content visually while keeping it announced to assistive technology — see `render.ts`'s
 * own doc for the full contract. React binding — import from `@zanix/space-ui/preact` instead for
 * the Preact one.
 *
 * @example
 * ```tsx
 * <Button label={undefined}>
 *   <Icon name="close" href="/sprite.svg" viewBox="0 0 24 24" />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </Button>
 * ```
 */
// Same `createElement`/`h` overload-set cast `Icon/index.ts` already needs and explains in full —
// not repeated here.
export const VisuallyHidden: (props: VisuallyHiddenProps) => ReactElement = createVisuallyHidden(
  createElement as unknown as CreateElement<ReactElement>,
)
