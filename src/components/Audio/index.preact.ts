import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createAudio } from './render.ts'
import type { AudioProps } from './types.ts'

/**
 * A real, native `<audio>` — see `index.ts`'s own doc for the full description, including
 * "Comet-safe, root barrel — a relative file/source path is NOT auto-resolved here". Preact binding,
 * same props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const Audio: (props: AudioProps) => VNode = createAudio(
  h as unknown as CreateElement<VNode>,
)
