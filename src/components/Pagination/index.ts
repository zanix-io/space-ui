import { createElement, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createPagination } from './render.ts'
import type { PaginationBaseProps } from './types.ts'

/** {@linkcode PaginationBaseProps} — nothing extra for the React binding. */
export type PaginationProps = PaginationBaseProps

/**
 * A `<nav>` of page-number controls — Previous/Next plus a windowed sequence of page numbers (see
 * `get-pagination-items.ts`'s own doc), the current page marked `aria-current="page"`. Real
 * implementation shared with the Preact binding via `render.ts`'s own `createPagination` (see that
 * file's own doc for how — hook injection, not just `h`); import from `@zanix/space-ui/preact`
 * instead for the Preact one, same contract, same rendered behavior. No legacy equivalent — new.
 *
 * ## `Link` when `getPageHref` is given, `Button` otherwise — never a "disabled `Link`"
 *
 * A real anchor has no coherent "disabled" state (unlike `Button`, which has a native `disabled`
 * attribute) — clicking one still navigates unless something intercepts it. Previous/Next are
 * therefore simply OMITTED from the DOM entirely at a boundary (`page === 1`/`page === totalPages`)
 * rather than rendered as some hacky `aria-disabled` stub — a legitimate, common pagination pattern,
 * and one that sidesteps the "disabled link" problem entirely rather than working around it.
 * Previous/Next also carry `rel="prev"`/`rel="next"` when rendered as `Link` — a real, standards-
 * based case `Link.rel`'s own doc already names by name.
 *
 * ## Never touches the URL itself
 *
 * `getPageHref` is the caller's own function — this component never constructs a query string or
 * reads `location` itself; it never owns URL or routing state at all. Omit it entirely for pure
 * client-state pagination with no URL of its own; every page item then renders as a plain `Button`.
 */
export const Pagination: (props: PaginationProps) => ReactElement | null = createPagination<
  ReactElement
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useState },
)
