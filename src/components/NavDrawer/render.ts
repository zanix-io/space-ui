import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createDrawer } from '../Drawer/render.ts'
import type { DrawerHooks } from '../Drawer/render.ts'
import { createMenu } from '../Menu/render.ts'
import type { MenuHooks, MenuRenderItem } from '../Menu/render.ts'
import type { NavDrawerItem, NavDrawerProps } from './types.ts'

/**
 * The hooks this component's shared body needs, injected alongside `h` — the union of
 * {@linkcode DrawerHooks} and {@linkcode MenuHooks} (both `createDrawer`/`createMenu` themselves
 * need in full), plus this component's own top-level `open` state (`useState`, already present via
 * `MenuHooks`) and its own `useCometStableId` for `panelId`.
 *
 * `useCometStableId` lives HERE, not on `MenuHooks` — `Menu` is deliberately dependency-free from
 * `@zanix/space` (see `Menu/index.ts`'s own "Zero `@zanix/space` dependency" doc), while `NavDrawer`
 * already has a real, direct one (`defineComet`, imported by `index.ts`), so it can safely import
 * `@zanix/space/comet/react`'s own `useCometStableId` for its OWN `panelId`: `NavDrawer` is a real
 * `'use comet'` Comet, and `panelId` needs to stay identical between the server render and the
 * client's own isolated hydration of it — see `useCometStableId`'s own doc for the full mechanism
 * (a Context-provided scope, unlike `Menu`'s own props-derived hash, which needs no such scope).
 * Same call-order-keying soundness argument `Menu/render.ts`'s own `MenuHooks` doc already makes —
 * repeated for a wider bag here, not a new reasoning.
 */
export type NavDrawerHooks = DrawerHooks & MenuHooks & { useCometStableId: () => string }

/** Minimal structural shape both a React `MouseEvent` and a native `MouseEvent` satisfy — this
 * file never imports React or Preact, same reasoning `shared/escape-to-close.ts`'s own
 * `EscapeKeyEvent` already documents. */
type NavDrawerClickEvent = { target: EventTarget | null }

/** Strips `NavDrawerItem[]` down into the exact `MenuRenderItem<Node>[]` shape the composed `Menu`
 * expects — identical fields, since `NavDrawerItem` deliberately carries no `visual` (see
 * `types.ts`'s own doc for why a Comet's own items never can); `visual` is simply never set on the
 * result. */
function toMenuItems<Node>(items: NavDrawerItem[]): MenuRenderItem<Node>[] {
  return items.map((item) => ({
    ...item,
    submenu: item.submenu ? toMenuItems<Node>(item.submenu) : undefined,
  }))
}

/** The path of an item's `url` when it is a same-origin link, without query, hash or a trailing
 * slash; `undefined` for an external or absent one. */
function itemPath(url: string | undefined, external: boolean | undefined): string | undefined {
  if (!url || external || !url.startsWith('/') || url.startsWith('//')) return undefined
  return url.split(/[?#]/)[0].replace(/\/+$/, '')
}

/** Every item, submenu items included, depth first. */
function flattenItems(items: NavDrawerItem[]): NavDrawerItem[] {
  return items.flatMap((item) => [item, ...(item.submenu ? flattenItems(item.submenu) : [])])
}

/**
 * Replaces each item's `current` with the one `pathname` decides: the item whose `url` is the
 * longest path that is `pathname` or a parent of it (so `/docs/guides/x` marks `/docs/guides`
 * rather than `/docs`) is current, and no other. A root `url` (`/`) is current only for `/` itself.
 * Nothing is current when no item matches.
 */
function markCurrentByPath(items: NavDrawerItem[], pathname: string): NavDrawerItem[] {
  const path = pathname.replace(/\/+$/, '')
  let best: NavDrawerItem | undefined
  let bestLength = -1
  for (const item of flattenItems(items)) {
    const own = itemPath(item.url, item.external)
    if (own === undefined) continue
    const matches = path === own || (own !== '' && path.startsWith(`${own}/`))
    if (matches && own.length > bestLength) {
      best = item
      bestLength = own.length
    }
  }
  const mark = (list: NavDrawerItem[]): NavDrawerItem[] =>
    list.map((item) => ({
      ...item,
      current: item === best,
      submenu: item.submenu ? mark(item.submenu) : undefined,
    }))
  return mark(items)
}

/**
 * The real implementation of `NavDrawer`, shared identically between the React and Preact
 * bindings — same `render.ts`-factory technique {@linkcode createMenu}/`createTable` already use,
 * extended to compose two other already-hook-injected factories (`createDrawer`/`createMenu`)
 * rather than plain stateless ones. Composes the real `Button` (hamburger toggle), `Drawer` (the
 * sliding panel — focus trap, `Escape`, backdrop, correct stacking with any open `Modal`), and
 * `Menu` (`toggle: false` — always rendered, since `Drawer` itself is what's shown/hidden) —
 * inherits their own `data-space-ui` hooks on every element they render, never a redundant one of
 * its own.
 *
 * ## Closing on navigation, built in
 *
 * The panel's own content is wrapped in a plain click listener that closes the drawer the moment a
 * click lands on a real anchor (`event.target.closest('a[href]')`) — a real navigation is exactly
 * the point at which a mobile nav drawer should get out of the way of the page it just navigated
 * to. This is plain DOM event delegation, never a router/URL read (seam 7): a disclosure toggle
 * `Button` inside the `Menu` (not an anchor) never matches, so opening a submenu never closes the
 * whole drawer.
 *
 * ## Always uncontrolled
 *
 * Unlike every other stateful component in this package, `open` has no controlled escape hatch —
 * see `types.ts`'s own `NavDrawerProps` doc for why a Comet's own props rule that out structurally.
 */
export function createNavDrawer<E>(
  h: CreateElement<E>,
  hooks: NavDrawerHooks,
  Fragment: unknown,
): (props: NavDrawerProps) => E {
  const Button = createButton(h)
  const Drawer = createDrawer<E, E>(h, hooks, Fragment)
  const Menu = createMenu<E>(h, hooks, Fragment)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function NavDrawer(props: NavDrawerProps): E {
    const {
      items,
      label,
      side = 'left',
      openMode = 'onClick',
      defaultOpen = false,
      closeOnEscape = true,
      nonce,
      id,
      className,
      openLabel = 'Open menu',
      closeLabel = 'Close menu',
      closeButtonLabel,
      toggleClassName,
      currentFromLocation = false,
    } = props

    const [open, setOpen] = hooks.useState(defaultOpen)
    // Called unconditionally, every render, regardless of whether `id` ends up used — a real hook,
    // so it must follow the same fixed call-order every other hook here does; `id ?? ...` only
    // decides which VALUE wins, never whether this call happens. See `NavDrawerHooks`' own doc for
    // why this is `@zanix/space/comet/react`'s own `useCometStableId`, not `Menu`'s dependency-free
    // hash.
    const generatedPanelId = hooks.useCometStableId()
    const panelId = id ?? generatedPanelId

    const handlePanelClick = (event: NavDrawerClickEvent) => {
      const target = event.target as (Element & { closest?: Element['closest'] }) | null
      if (target?.closest?.('a[href]')) setOpen(false)
    }

    const toggleButton = Button({
      onClick: () => setOpen((current) => !current),
      label: open ? closeLabel : openLabel,
      className: toggleClassName,
      'aria-expanded': open,
      'aria-controls': panelId,
    })

    // The panel only exists while open and opening re-renders, so the location read here is always
    // fresh and never part of the server/hydration render (a closed drawer shows no items).
    const pathname = currentFromLocation && open
      ? (globalThis as { location?: { pathname: string } }).location?.pathname
      : undefined
    const shownItems = pathname === undefined ? items : markCurrentByPath(items, pathname)
    const menu = Menu({ items: toMenuItems<E>(shownItems), label, openMode, toggle: false })

    const panel = h('div', { onClick: handlePanelClick }, menu)

    const drawer = Drawer({
      open,
      onClose: () => setOpen(false),
      side,
      label,
      closeLabel: closeButtonLabel,
      closeOnEscape,
      nonce,
      id: panelId,
      className,
      children: panel,
    })

    // Keyed, same reasoning `Menu/render.ts`'s own doc gives for its own unconditional `Fragment`
    // wrapping — neither `Button`'s nor `Drawer`'s own return type accepts a `key` prop through
    // their already-closed types, so each sibling is wrapped individually here instead.
    return hAny(Fragment, null, [
      hAny(Fragment, { key: 'toggle' }, toggleButton),
      hAny(Fragment, { key: 'panel' }, drawer),
    ])
  }
}
