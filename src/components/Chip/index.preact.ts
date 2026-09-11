import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createChip } from './render.ts'
import type { ChipBaseProps } from './types.ts'

export type { ChipBaseProps } from './types.ts'

/** {@linkcode ChipBaseProps} — nothing extra for the Preact binding. */
export type ChipProps = ChipBaseProps

/**
 * A pill-shaped label, static or removable — see `index.ts`'s own doc for the full contract, not
 * repeated here. Preact binding, same props, same rendered markup; import from `@zanix/space-ui`
 * (no subpath) for the React one.
 */
export const Chip: (props: ChipProps) => VNode = createChip(
  h as unknown as CreateElement<VNode>,
)
