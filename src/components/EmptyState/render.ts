import type { CreateElement } from 'typings/renderer.ts'
import type { EmptyStateBaseProps } from './types.ts'

/** {@linkcode EmptyStateBaseProps} plus `icon`/`action`, generic over the renderer's own node type
 * — `index.ts`/`index.preact.ts` each instantiate this as their own public `EmptyStateProps`, same
 * split `CardRenderProps<Node>` already establishes. */
export type EmptyStateRenderProps<Node> = EmptyStateBaseProps & {
  /** Render-prop slot for a decorative icon/illustration — same calling convention as
   * `Card.visual`/`ImgButton.visual` (`() => Node`, an already-built element, never a data shape
   * this component resolves itself). Always rendered `aria-hidden` by this component's own wrapper
   * — purely decorative, the heading/description below already carry the real accessible content. */
  icon?: () => Node
  /**
   * Render-prop slot for an optional call-to-action — typically a `Button` or `Link` instance the
   * CALLER builds and hands back, never a component this file imports or composes itself. This
   * package's own leaf components (`Button`/`Link`) are already zero-`@zanix/space`-dependency and
   * freely composable, but `EmptyState` still doesn't reach for either directly: unlike `Card`
   * (which composes `Link` for a data-shaped `footer: LinkProps[]`, since a card's footer links are
   * genuinely uniform, always anchors), an empty-state action is exactly as likely to be a `Button`
   * (`"Create your first event"`, a client-side action) as a `Link` (`"Browse the catalog"`,
   * real navigation) — there's no one shape common enough here to justify a bundled prop the way
   * `Card.footer` justified `Link[]`, so this stays a plain render-prop instead, keeping this leaf
   * component decoupled from either.
   */
  action?: () => Node
}

/**
 * The real implementation of `EmptyState`, shared identically between the React and Preact
 * bindings — stateless, same `render.ts`-factory pattern `Icon`/`Alert`/`Skeleton` already
 * establish (no hooks of any kind: every prop here is already-resolved data or a render-prop the
 * caller owns).
 *
 * A real semantic block, not a bag of unstructured `<div>`s: {@linkcode EmptyStateBaseProps.heading}
 * always renders as a real heading element (level configurable via `headingLevel`, see that prop's
 * own doc for why — unlike `Card`'s own fixed `<h2>`, this component is equally likely to be a
 * page-level block or nested inside one that already has its own heading), so it reads correctly
 * both as a standalone "nothing here yet" page state and nested inside a `Card`/section.
 * `description`, when given, renders as a real `<p>` immediately after it.
 */
export function createEmptyState<E>(h: CreateElement<E>): (props: EmptyStateRenderProps<E>) => E {
  return function EmptyState(props: EmptyStateRenderProps<E>): E {
    const {
      heading,
      description,
      headingLevel = 'h3',
      type = 'div',
      icon,
      action,
      id,
      className,
    } = props

    const iconEl = icon
      ? h('div', { 'data-space-ui': 'empty-state-icon', 'aria-hidden': 'true' }, icon())
      : null
    const headingEl = h(
      'div',
      { 'data-space-ui': 'empty-state-heading' },
      h(headingLevel, null, heading),
    )
    const descriptionEl = description
      ? h('p', { 'data-space-ui': 'empty-state-description' }, description)
      : null
    const actionEl = action ? h('div', { 'data-space-ui': 'empty-state-action' }, action()) : null

    return h(
      type,
      { id, className, 'data-space-ui': 'empty-state' },
      iconEl,
      headingEl,
      descriptionEl,
      actionEl,
    )
  }
}
