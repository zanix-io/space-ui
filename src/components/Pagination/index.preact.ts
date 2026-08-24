import { h } from 'preact'
import type { VNode } from 'preact'
import { useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createPagination } from './render.ts'
import type { PaginationBaseProps } from './types.ts'

/** {@linkcode PaginationBaseProps} — nothing extra for the Preact binding. */
export type PaginationProps = PaginationBaseProps

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (`Link` vs `Button`, why a
 * boundary omits Previous/Next entirely rather than rendering a disabled link, why this never
 * touches the URL itself) — not repeated here. Same contract, same rendered behavior, real
 * implementation shared with the React binding via `render.ts`'s own `createPagination` (hook
 * injection, not just `h` — see that file's own doc for why that's sound) — never `preact/compat`.
 */
export const Pagination: (props: PaginationProps) => VNode | null = createPagination<VNode>(
  h as unknown as CreateElement<VNode>,
  { useState },
)
