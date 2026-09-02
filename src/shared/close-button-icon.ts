import type { CreateElement } from 'typings/renderer.ts'

/**
 * The default visible content `Modal`/`Drawer`/`Toast` each render as their own built-in close
 * button's `children`, whenever the caller doesn't supply `closeButtonContent` — a real, inline
 * `<svg>` "X", not a plain Unicode character: a system-font glyph (`×`/`✕`) can render inconsistently
 * — or as a missing-glyph box — across browsers/platforms, where an inline `<svg>` renders
 * identically everywhere with no more of a footprint than the character had (still zero external
 * asset, zero network request — this is markup the component renders directly).
 *
 * Deliberately not `CatalogIcon`: the sprite `CatalogIcon` resolves against (`catalog.svg`) is a
 * template asset, never part of this package's own module graph or `exports` map — a consuming
 * project only gets it via the CLI's own `--icons` scaffold flag, at whatever path that project
 * chooses, and `CatalogIcon` needs that exact `href` to render anything. `Modal`/`Drawer`/`Toast`
 * have no way to know it, and most consumers never scaffold the catalog at all — calling
 * `CatalogIcon` here would either render a broken `<use>` reference for them, or force every
 * consumer to scaffold an icon catalog just to get a working close button, breaking the
 * "importing `@zanix/space-ui` costs nothing unless referenced" guarantee this package otherwise
 * holds throughout.
 *
 * `stroke="currentColor"` themes the same way this package's own `Icon`/`CatalogIcon` already do —
 * ordinary CSS `color` inheritance, no extra prop needed. `aria-hidden`/`focusable="false"` on the
 * `<svg>` itself: the close button that renders this already carries the real accessible name
 * (`aria-label="Close"`) via `Button.label` — this glyph itself must never be separately announced
 * (a redundant "times, Close" or "multiplication sign, Close").
 */
export function createDefaultCloseIcon<E>(h: CreateElement<E>): () => E {
  return function DefaultCloseIcon(): E {
    return h(
      'svg',
      {
        width: 14,
        height: 14,
        viewBox: '0 0 14 14',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('path', {
        d: 'M1 1L13 13M13 1L1 13',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    )
  }
}
