import type { CreateElement } from 'typings/renderer.ts'
import type { GridItemProps, GridProps } from './types.ts'
import { resolveTemplateArea } from './utils.ts'

/**
 * A real CSS Grid container (`display: grid`) plus its cell primitive, `GridItem`. No hooks, no
 * state, no timers — both are pure functions of their props. Audited for viewport dependence (the
 * transversal criterion applied to every component from here on): none — `templateColumns`/
 * `templateRows`/`gap`/`height` are all static, caller-supplied values; no `useResolution`,
 * `matchMedia`, resize listener, or `IntersectionObserver` anywhere in the component this rescues.
 *
 * `display: grid` is set inline, unconditionally — the one exception to "no component-owned
 * styling" this component needs, and a different kind of exception than `Image.placeholder`'s:
 * this isn't a visual opinion with a legitimate alternative (there's no valid "Grid but not
 * actually a grid" state) — it's the literal mechanism `templateColumns`/`templateRows`/`gap`
 * depend on to mean anything at all, the same category as an `<img>`'s `width`/`height`
 * attributes. No other default height/sizing behavior is imposed — omitting `height` leaves the
 * container at the browser's own `height: auto`, never a component-chosen fallback.
 *
 * `GridItem`'s `columnStart`/`columnEnd`/`rowStart`/`rowEnd` map straight onto the real CSS
 * `grid-column-start`/`grid-column-end`/`grid-row-start`/`grid-row-end` properties, identically on
 * both axes, with NO offset applied on either — a deliberate fix, not a straight port. The
 * component this rescues added `+1` to `columnEnd` only, never to `rowEnd` — an inconsistency
 * between the two axes with no real justification,
 * not an intentional convenience: nothing about CSS Grid's own column/row model differs between
 * the two, and the one real caller in that codebase that computed a `rowEnd` value did so already
 * assuming a raw CSS line number, not the "friendly count" `columnEnd` alone received. Passing
 * every value straight through as the real CSS grid line number — no magic, no undocumented
 * offset — is the more predictable, spec-accurate contract, consistent with this package's own
 * "already-resolved data as props" principle elsewhere. This is a real behavior change: a
 * `columnEnd` value carried over unchanged from that other component now spans one column less;
 * add 1 at the call site to get the previous visual result back.
 *
 * A load-bearing cross-renderer difference: React's own style-object serialization knows
 * `grid-column-start`/`grid-row-end` (and their `*-start`/`*-end` siblings) are unitless integer
 * properties and emits them bare (`grid-column-start:2`) — but Preact's does NOT recognize these
 * specific properties as unitless, and silently appends `px` to a bare JS `number` value instead
 * (`grid-column-start:2px`), which is invalid CSS for a grid-line property (the browser drops it,
 * falling back to `auto` — a real, silent layout failure, not a cosmetic one). Converting each
 * defined value to a string BEFORE it reaches the style object (`String(columnStart)`, not the
 * raw number) sidesteps Preact's unitless-property heuristic entirely and produces byte-identical
 * output to React's own in both renderers. This is the one place in this file that needs
 * renderer-specific awareness at all.
 *
 * `children` validation (an `item.type !== GridItem` runtime throw in the component this rescues) is intentionally not
 * ported — this package trusts its own TypeScript types for structural contracts elsewhere (e.g.
 * `Button`'s `role`/`checked`/`selected` pairing has no runtime check either), and the specific
 * thing that check was protecting — auto-injecting an `index` prop and merging a `styles` prop
 * into every child via `cloneElement` — no longer exists to protect: both existed solely to feed
 * this package's own discarded BEM styling convention (`index` fed a `__item--N` modifier class;
 * `styles` was the BEM style-merge prop) and have no other purpose once that mechanism is gone.
 * With nothing left to inject, `Grid` renders `children` exactly as given — no `Children.toArray`,
 * no `cloneElement`, no React-specific child-manipulation API standing in the way of a Preact
 * binding either.
 *
 * `GridItem`'s `useEffect` that added a `display: contents` utility class to every one of its own
 * DOM children on mount — letting a wrapping element inside a cell disappear from grid-track
 * sizing while its own children still participate — is not ported as JavaScript. The same visual
 * effect is a single, purely declarative CSS rule a consumer adds once, with zero JS, zero
 * hydration timing gap (that version only took effect after mount, client-side — a real,
 * if minor, first-paint/SSR mismatch this rescue doesn't have): `[data-space-ui="grid-item"] > * {
 * display: contents; }`. Porting the imperative version would also have meant `GridItem` needing a
 * real per-renderer hook implementation (this package's `useState`/`useEffect`-using components
 * ship as a genuine second implementation, not a shared `render.ts`) for a purely structural CSS
 * technique that never needed one.
 */
export function createGrid<E>(h: CreateElement<E>): (props: GridProps) => E {
  return function Grid(props: GridProps): E {
    const { templateColumns, templateRows, gap = '1rem', height, id, className, children } = props

    return h('div', {
      id,
      className,
      'data-space-ui': 'grid',
      style: {
        display: 'grid',
        gap,
        gridTemplateColumns: resolveTemplateArea(templateColumns),
        gridTemplateRows: resolveTemplateArea(templateRows),
        height: height === undefined
          ? undefined
          : typeof height === 'number'
          ? `${height}px`
          : height,
      },
    }, children)
  }
}

export function createGridItem<E>(h: CreateElement<E>): (props: GridItemProps) => E {
  return function GridItem(props: GridItemProps): E {
    const { columnStart, columnEnd, rowStart, rowEnd, id, className, children } = props

    return h('div', {
      id,
      className,
      'data-space-ui': 'grid-item',
      style: {
        // Stringified — see this module's own doc for why a raw number here breaks in Preact.
        gridColumnStart: columnStart === undefined ? undefined : String(columnStart),
        gridColumnEnd: columnEnd === undefined ? undefined : String(columnEnd),
        gridRowStart: rowStart === undefined ? undefined : String(rowStart),
        gridRowEnd: rowEnd === undefined ? undefined : String(rowEnd),
      },
    }, children)
  }
}
