import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createIcon } from './render.ts'
import type { IconProps } from './types.ts'

/**
 * An SVG sprite icon (`<svg><use href="#..." /></svg>`) — the same pattern the Zanix ecosystem
 * has always used for icons, kept deliberately simple here: no asset-path resolution, no i18n, no
 * responsive breakpoint sizing baked in. Those are the caller's own concerns; `Icon` only ever
 * renders markup from the props it's given.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Icon name="arrow-right" href="/assets/icons/sprite.svg" viewBox="0 0 24 24" label="Next" />
 * ```
 */
// `React.createElement` is overloaded per-tag (a dedicated signature for `'input'`, one for
// `'select'`, a generic one for any other string tag, ...) — a real structural TypeScript limit,
// not a shortcut: no single one of those overloads matches `CreateElement<E>`'s own general
// `(type: string, props, ...children) => E` shape, so nothing narrower than a cast can satisfy it
// (a direct, uncast assignment fails `deno check`). Safe here because the call sites in
// `render.ts` only ever pass a plain string tag (`'svg'`/`'use'`) with a plain props object —
// exactly what `createElement`'s own generic overload already accepts at runtime; the cast only
// works around the overload SET being unmatchable, not around any real behavioral mismatch.
export const Icon: (props: IconProps) => ReactElement = createIcon(
  createElement as unknown as CreateElement<ReactElement>,
)
