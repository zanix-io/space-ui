import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createChip } from './render.ts'
import type { ChipBaseProps } from './types.ts'

export type { ChipBaseProps } from './types.ts'

/** {@linkcode ChipBaseProps} — nothing extra for the React binding. */
export type ChipProps = ChipBaseProps

/**
 * A pill-shaped label — static (informational) when {@linkcode ChipBaseProps.onRemove} is omitted,
 * or a removable tag (a real, keyboard-operable "×" button, `aria-label="Remove {label}"`) when
 * it's given. Real implementation shared with the Preact binding via `render.ts`'s own `createChip`
 * (composes the unmodified `Button` for its own remove control, see that file's own doc for the
 * full contract, including why `MultiSelect`'s own internal chip markup isn't refactored to reuse
 * this in this change); import from `@zanix/space-ui/preact` instead for the Preact one, same
 * contract, same rendered behavior.
 *
 * `tone` is a plain, open `data-tone` passthrough — see {@linkcode ChipBaseProps.tone}'s own doc
 * for why this deliberately isn't a closed set of specific accent names: this package ships no CSS
 * and owns no color identity, so the actual tone→color mapping is entirely a consuming app's own
 * stylesheet's job (`[data-space-ui='chip'][data-tone='...']`).
 *
 * @example
 * ```tsx
 * <Chip label="Vegetarian" />
 * <Chip label="Board games" tone="primary" onRemove={() => removeInterest('Board games')} />
 * ```
 */
export const Chip: (props: ChipProps) => ReactElement = createChip(
  createElement as unknown as CreateElement<ReactElement>,
)
