import type { CreateElement } from 'typings/renderer.ts'
import { createGrid, createGridItem } from '../Grid/render.ts'
import { createImage } from '../Image/render.ts'
import { createLink } from '../Link/render.ts'
import type { CardBaseProps } from './types.ts'

/** {@linkcode CardBaseProps} plus `visual`, generic over the renderer's own node type —
 * `index.ts`/`index.preact.ts` each instantiate this as their own public `CardProps`.
 *
 * `visual` is a render-prop slot — same calling convention as `Menu`'s own `MenuRenderItem.visual`
 * and `ImgButton`'s own `visual` (`() => Node`, the caller supplies an already-built element rather
 * than a data shape this component resolves itself). Wins over {@linkcode CardBaseProps.image} when
 * both are given — see this file's own doc for the full precedence. */
export type CardRenderProps<Node> = CardBaseProps & {
  visual?: () => Node
}

/**
 * A title/subtitle/content/footer/visual composition over `Grid`, reusing `Link` exactly as
 * already built — no duplicated link-rendering logic of any kind. No hooks, no state, no viewport
 * detection: `useResolution`, `window`, `resize`, `matchMedia`, and `IntersectionObserver` are all
 * absent from this file.
 *
 * ## The stacked/side-by-side layout is CSS, not JavaScript
 *
 * The component this rescues used `useResolution('dsm')` to compute `isStacked` in JS, then
 * branched between two different sets of `Grid`/`GridItem` props — a real, structural difference
 * (which `templateColumns` the grid used, and whether each item carried explicit column/row
 * placement at all), not just a styling difference. Reproducing that here would mean either
 * running the same JS viewport detection (explicitly ruled out) or accepting an SSR/client
 * mismatch (the same real bug that mechanism had — see `Video/render.ts`'s own doc for the
 * general shape of that problem). Instead, this component renders ONE fixed structure, and
 * `src/templates/shared/card.css` (optional, never imported by this file or any runtime code)
 * expresses the responsive reflow declaratively:
 *
 * - `Grid` here always receives `templateColumns="1fr 1fr"` and `templateRows="repeat(5, auto)"`
 *   — fixed, identical regardless of viewport or `stacked`. This is the one property that must
 *   stay constant: `Grid` sets `grid-template-columns`/`grid-template-rows` as inline styles
 *   (see `Grid/render.ts`'s own doc), and an inline style cannot be overridden by any external
 *   rule, media query or not, without `!important` — a real constraint this design works around
 *   entirely rather than fights. `grid-template-areas`, which `Grid` never sets, is the only
 *   property `card.css` ever needs to change per breakpoint, so no `!important` is needed
 *   anywhere in this component's styling story.
 * - Every `GridItem` here is rendered with NO placement props at all (`columnStart`/`columnEnd`/
 *   `rowStart`/`rowEnd` all omitted), which omits the corresponding inline style entirely in both
 *   renderers (a `style` object value of `undefined` is dropped, not serialized as `undefined`).
 *   `card.css` makes each `GridItem` transparent to the grid
 *   (`[data-space-ui="card"] [data-space-ui="grid-item"] { display: contents; }`) and assigns a
 *   real `grid-area` to the semantic wrapper INSIDE it instead
 *   (`[data-space-ui="card-title"] { grid-area: title; }`, etc.) — `display: contents` makes an
 *   element's own box disappear while its children still participate in the parent layout, so the
 *   grid-area ends up applying to the actual content, not to an inert wrapper. This is scoped
 *   strictly to `[data-space-ui="card"] [data-space-ui="grid-item"]` — a `GridItem` used anywhere
 *   else, outside a `Card`, never matches this selector and is entirely unaffected; `GridItem`
 *   itself carries no new behavior of any kind, deliberately (`Grid`/`GridItem` are unchanged from
 *   what's already shipped — this file imports and calls their existing factories, nothing more).
 * - `card.css`'s default rule (no media query) lays every area out in one visual column, in DOM
 *   order — title, subtitle, content, footer, then the visual last, always, regardless of `align` —
 *   matching the stacked case exactly. `@media (min-width: 721px)` — the exact same threshold
 *   `useResolution('dsm')` used — replaces it with a two-column layout: `align="left"` puts the
 *   visual in the first column, anything else (including omitted) puts it in the second, read from
 *   `data-align` on the `Card` root, matching the row-order-independent semantics `align` already
 *   had.
 * - `stacked` explicit overrides (`data-stacked="true"|"false"` on the `Card` root) use a
 *   selector with one additional attribute (`[data-space-ui="card"][data-stacked="…"]`) — higher
 *   specificity than the plain/media-query rules, so they win at every viewport without needing
 *   `!important` either, and without being wrapped in a media query themselves (an explicit
 *   override applies unconditionally, by definition).
 *
 * Both `card.css`'s rules and the fixed `Grid` template are designed so an empty area (e.g. no
 * `title` given) simply collapses — `grid-template-rows: repeat(5, auto)` sizes an area with no
 * assigned element to its own zero-height min-content, the same way it always has, with nothing
 * component-specific needed to detect or special-case a missing item.
 *
 * `card.css` is genuinely optional, exactly like `shared/behavior.css`: without it, `Card` still
 * renders fully valid markup — every item present, in the correct DOM order — just without the
 * two-column desktop reflow, since nothing else on this page can provide it. No JavaScript ever
 * attempts to reproduce what the CSS would have done.
 *
 * ## `visual` (render-prop) and `image` (convenience sugar over the comet-safe `Image`)
 *
 * `visual` is a render-prop slot (see {@linkcode CardRenderProps.visual}'s own doc) — the caller
 * supplies an already-built element (their own `Image` instance, resolved server-side outside a
 * Comet, a plain `<img>`, anything at all) rather than a data shape this component resolves
 * itself. `image` ({@linkcode CardBaseProps.image}) is convenience sugar on top: when `visual` is
 * absent, this internally builds the visual as `Image({ ...image, alt: '' })` — the comet-safe,
 * root-barrel `Image` from `../Image/render.ts`'s own now-resolver-agnostic `createImage` factory,
 * called here with NO resolver injected (see that file's own module doc for the full two-binding
 * shape). This is safe precisely BECAUSE `Image/render.ts` no longer has a hardcoded `@zanix/space`
 * import: a static ES import is unconditionally hoisted regardless of runtime branching, so
 * composing `Image` here reaches `@zanix/space`'s own `resolveAssetHref` only if this file's own
 * `createImage(h, resolveHref)` call actually passes one — it doesn't, so `Card` stays fully
 * comet-safe with `image` composed. `visual` wins when both are given — an explicit render-prop
 * always beats the convenience shorthand, since the caller opted into more control. `align` stays a
 * top-level `CardProps` field, independent of either (see `types.ts`'s own `CardBaseProps.align`
 * doc) — it was always Card's own layout concern, never really a property of the visual itself.
 *
 * No visual decision is introduced here beyond what's strictly needed to reproduce the layout — no
 * `object-fit`, no forced `aspect-ratio`, no dimensions imposed on whatever the resolved visual is.
 *
 * A known, accepted trade-off: React's dev-mode console warns about a missing `key` on the item
 * list this passes to `Grid`. `GridItem`'s own `render.ts` never accepts or forwards a `key` (and,
 * per this component's own scope, isn't being changed to) — the array itself is entirely rebuilt
 * from props on every render, with no internal state of its own in any item (`visual()`'s own
 * result, `Link`, `GridItem` are all stateless from this component's own perspective), so the real
 * risk that warning exists to flag — reconciliation misattributing a stateful child across a
 * reordered list — doesn't apply here. This is a diagnostic-only warning, not a correctness bug,
 * and fixing it would mean either an extra wrapping element around every item (breaking the
 * direct-grid-child structure `card.css` depends on) or a React-specific `cloneElement` call in
 * this otherwise fully renderer-agnostic file.
 */
export function createCard<E>(h: CreateElement<E>): (props: CardRenderProps<E>) => E {
  const Grid = createGrid(h)
  const GridItem = createGridItem(h)
  const Link = createLink(h)
  // No resolver injected — the comet-safe, root-barrel `Image` (see this function's own doc for
  // why that's what keeps `Card` itself comet-safe with `image` composed).
  const Image = createImage(h)

  return function Card(props: CardRenderProps<E>): E {
    const {
      type = 'div',
      title,
      subtitle,
      content,
      footer,
      visual,
      image,
      align,
      stacked,
      id,
      className,
    } = props

    const cell = (dataSpaceUi: string, child: E) =>
      GridItem({ children: h('div', { 'data-space-ui': dataSpaceUi }, child) })

    const items: E[] = []

    if (title) items.push(cell('card-title', h('h2', null, title)))
    if (subtitle) items.push(cell('card-subtitle', h('h5', null, subtitle)))
    items.push(cell('card-content', h('div', null, content)))
    if (footer?.length) {
      items.push(cell('card-footer', h('div', null, ...footer.map((link) => Link(link)))))
    }
    const resolvedVisual = visual ? visual() : image ? Image({ ...image, alt: '' }) : undefined
    if (resolvedVisual !== undefined) {
      items.push(cell('card-image', resolvedVisual))
    }

    return h(
      type,
      {
        id,
        className,
        'data-space-ui': 'card',
        'data-align': align === 'left' ? 'left' : undefined,
        'data-stacked': stacked === undefined ? undefined : String(stacked),
      },
      Grid({ templateColumns: '1fr 1fr', templateRows: 'repeat(5, auto)', children: items }),
    )
  }
}
