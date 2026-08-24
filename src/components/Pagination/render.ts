import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createLink } from '../Link/render.ts'
import { getPaginationItems } from './get-pagination-items.ts'
import type { PaginationBaseProps } from './types.ts'

/**
 * The subset of `useState` this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createPagination}'s own doc points back at `Table`'s
 * `TableHooks` for (only ever `useState`, no `useEffect`/`useRef` pair whose cleanup/ref-identity
 * semantics could plausibly differ between React and Preact — see that file's own doc for the full
 * reasoning, not repeated here).
 */
export type PaginationHooks = {
  useState: <T>(initial: T) => [T, (value: T) => void]
}

/**
 * The real implementation of `Pagination`, shared identically between the React and Preact
 * bindings — same pattern as `Table/render.ts` (hook injection, not just `h`). Composes the real
 * `Button`/`Link` (via their own `render.ts` factories, bound to the same `h`) — inherits their
 * `data-space-ui="button"`/`"link"` hooks on the elements they render, never a redundant one of its
 * own; the root `<nav>` itself carries `data-space-ui="pagination"`, the `<ul>` carries
 * `data-space-ui="pagination-list"`.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (controlled `page`, `Link` when
 * `getPageHref` is given and `Button` otherwise, why a boundary omits Previous/Next entirely rather
 * than rendering a disabled link, why this never touches the URL itself) — not repeated here.
 */
export function createPagination<E>(
  h: CreateElement<E>,
  hooks: PaginationHooks,
): (props: PaginationBaseProps) => E | null {
  const Button = createButton(h)
  const Link = createLink(h)

  return function Pagination(props: PaginationBaseProps): E | null {
    const {
      totalPages,
      page: controlledPage,
      defaultPage = 1,
      onPageChange,
      getPageHref,
      siblingCount = 1,
      label = 'Pagination',
      id,
      className,
    } = props
    const isControlled = controlledPage !== undefined
    const [internalPage, setInternalPage] = hooks.useState(defaultPage)
    const page = isControlled ? controlledPage : internalPage

    const setPage = (next: number) => {
      if (!isControlled) setInternalPage(next)
      onPageChange?.(next)
    }

    if (totalPages <= 1) return null

    const control = (
      target: number,
      children: string,
      { rel, key }: { rel?: string; key: string },
    ) =>
      h(
        'li',
        { key },
        getPageHref
          ? Link({
            href: getPageHref(target),
            rel,
            onClick: () => setPage(target),
            'aria-current': target === page ? 'page' : undefined,
            children,
          })
          : Button({
            onClick: () => setPage(target),
            'aria-current': target === page ? 'page' : undefined,
            children,
          }),
      )

    const items = getPaginationItems(page, totalPages, siblingCount)

    return h(
      'nav',
      { id, className, 'aria-label': label, 'data-space-ui': 'pagination' },
      h(
        'ul',
        { 'data-space-ui': 'pagination-list' },
        [
          page > 1 ? control(page - 1, 'Previous', { rel: 'prev', key: 'prev' }) : null,
          ...items.map((item, index) =>
            item === 'ellipsis'
              ? h('li', { key: `ellipsis-${index}` }, h('span', { 'aria-hidden': 'true' }, '…'))
              : control(item, String(item), { key: String(item) })
          ),
          page < totalPages ? control(page + 1, 'Next', { rel: 'next', key: 'next' }) : null,
        ],
      ),
    )
  }
}
