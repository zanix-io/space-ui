import { h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createFileInput } from './render.ts'
import type { FileInputBaseProps } from './types.ts'

/** {@linkcode FileInputBaseProps} — nothing extra for the Preact binding. */
export type FileInputProps = FileInputBaseProps

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (why this is a genuinely
 * different shape from `Input`, `onFilesChange`'s real `File[]`, `resetTrigger`, composing inside
 * `Field`) — not repeated here. Same contract, same rendered behavior, real implementation shared
 * with the React binding via `render.ts`'s own `createFileInput` (hook injection — see that file's
 * own doc for why no `onChange`/`onInput` split is needed here, unlike `Input`) — never
 * `preact/compat`.
 */
export const FileInput: (props: FileInputProps) => VNode = createFileInput<VNode>(
  h as unknown as CreateElement<VNode>,
  { useEffect, useRef },
)
