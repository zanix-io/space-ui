import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createIcon } from '../Icon/render.ts'
import { createLink } from '../Link/render.ts'
import { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'
import { deriveStableCometId } from 'shared/stable-comet-id.ts'
import type { MenuBaseProps, MenuItemFields, MenuOpenMode } from './types.ts'

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here). No `useId` —
 * `submenuId`/`listId` are derived from item/props identity (`stable-comet-id.ts`) instead, since
 * this component can end up nested inside a Comet's own isolated hydration root (`NavDrawer`
 * composes it directly), where `useId()`'s "stable within one root" guarantee doesn't hold.
 *
 * **Not `@zanix/space`'s own `useCometStableId`** — the more general fix `NavDrawer/render.ts`'s
 * own `panelId` uses — because this component is deliberately dependency-free from `@zanix/space`
 * (see `index.ts`'s own "Zero `@zanix/space` dependency, by construction" doc, and the permanent
 * structural guard behind it): `useCometStableId` lives at `@zanix/space/comet/react`, and importing
 * it here would give `Menu` a real runtime dependency it is built specifically not to have. The hash
 * approach below needs no Context/Provider at all — it stays correct under nesting REGARDLESS of
 * whether the surrounding tree happens to be a Comet, which is strictly more robust for a
 * zero-dependency component than a Provider-based scope it structurally cannot reach.
 * `useRef`/`useState` are still only ever called at this component's own top level, in the same
 * order, every render — never conditionally, never inside a loop — so the same call-order-keying
 * argument `Table/render.ts` makes still applies to them unchanged.
 *
 * `useCloseOnOutside` is itself injected too, not imported directly — it's already a per-renderer
 * pair (`shared/close-on-outside.ts`/`.preact.ts`, each built on that renderer's own
 * `useEffect`/`useRef`), so `index.ts`/`index.preact.ts` each pass their own already-bound one in,
 * the same way each passes its own `useState`.
 */
export type MenuHooks = {
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useCloseOnOutside: (
    ref: { current: HTMLElement | null },
    active: boolean,
    onClose: () => void,
  ) => void
}

/** Minimal structural shape both `React.FocusEvent` and a native `FocusEvent` satisfy — this file
 * never imports React or Preact, same reasoning `shared/escape-to-close.ts`'s own `EscapeKeyEvent`
 * already documents for `KeyboardEvent`. */
type MenuFocusEvent = { relatedTarget: EventTarget | null }

/**
 * One `Menu` entry, generic over the renderer's own node type — {@linkcode MenuItemFields} (every
 * field whose type doesn't depend on the renderer) plus `visual`/`submenu`, which do.
 * `index.ts`/`index.preact.ts` each instantiate this with `ReactNode`/`ComponentChildren` as their
 * own public `MenuItem`.
 *
 * `visual` is a render-prop slot — same calling convention as `Table.cell`'s own
 * `(row, rowIndex) => Node`: the caller supplies an already-built element (their own `Image`/
 * `ImgButton` instance, resolved server-side outside a Comet exactly as `@zanix/space`'s own
 * `formatServerOnlyViolation` guidance already directs, a plain `<img>`, anything at all) rather
 * than a data shape this component resolves itself. This is what lets `Menu` compose only
 * `Link`/`Button`/`Icon` internally — never `Image`/`ImgButton` — so its own module has zero
 * reachable dependency on `@zanix/space` (see `index.ts`'s own doc, "Zero `@zanix/space`
 * dependency, by construction", for the full story). Wins over nothing, loses to `icon`: `icon`
 * takes precedence when both are given, the same precedence `ImgButton` already establishes
 * between its own `icon`/`visual`.
 */
export type MenuRenderItem<Node> = MenuItemFields & {
  visual?: () => Node
  submenu?: MenuRenderItem<Node>[]
}

/** {@linkcode MenuBaseProps} plus `items`, generic over the renderer's own node type — `index.ts`/
 * `index.preact.ts` each instantiate this as their own public `MenuProps`. */
export type MenuRenderProps<Node> = MenuBaseProps & { items: MenuRenderItem<Node>[] }

/**
 * The real implementation of `Menu`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`, extended with a wider hook bag (see {@linkcode MenuHooks}'s
 * own doc). Composes the real `Button`/`Link`/`Icon` (via their own `render.ts` factories, bound to
 * the same `h`) — inherits their own `data-space-ui` hooks on the elements they render, never a
 * redundant one of its own; the root `<nav>` itself carries `data-space-ui="menu"`. Deliberately
 * does NOT compose `Image`/`ImgButton` — see {@linkcode MenuRenderItem}'s own `visual` doc.
 *
 * ## `Fragment`, applied unconditionally
 *
 * The component this was extracted from wrapped `primary` in a keyed `Fragment` specifically to
 * silence a React-only dev-mode "missing key" console warning (`primary` comes from several
 * different branches, none of which accept a `key` prop through their own already-closed types);
 * Preact never warns for that shape, so its own hand-written binding skips the wrapper. Both
 * are harmless either way (a redundant `Fragment` around one child renders identically) — so the
 * shared body here applies it unconditionally rather than needing a per-renderer branch, the same
 * resolution `space-ui-component-patterns` documents for this exact wrinkle. `Fragment` itself is
 * injected as its own parameter (not a hook, so not part of {@linkcode MenuHooks}) since
 * `CreateElement`'s own `type` parameter is typed as `string` only — calling `h` with a component
 * reference instead needs the same kind of widening cast `index.ts`'s own `Menu` binding doc already
 * names for other components, done once here rather than at every call site.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (structure, `toggle`, per-item
 * control shape, `openMode`, closing) — not repeated here.
 */
export function createMenu<E>(
  h: CreateElement<E>,
  hooks: MenuHooks,
  Fragment: unknown,
): (props: MenuRenderProps<E>) => E {
  const Button = createButton(h)
  const Link = createLink(h)
  const Icon = createIcon(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  function MenuItemRow({ item, openMode }: { item: MenuRenderItem<E>; openMode: MenuOpenMode }): E {
    const { label, url, external, rel, title, accessibleLabel, icon, visual, submenu } = item
    const hasSubmenu = !!submenu?.length
    const hasUrl = url !== undefined
    const accessibleName = accessibleLabel

    // Derived from the item's own identity (`url ?? label`, the SAME disambiguation `key` below
    // already uses for these siblings), never `hooks.useId()`/`useCometStableId()` — see
    // `MenuHooks`' own doc above for why this component stays on the dependency-free hash instead.
    const submenuId = deriveStableCometId(item.url ?? item.label, 'menu-submenu')
    const [isOpen, setIsOpen] = hooks.useState(openMode === 'onRender')
    const containerRef = hooks.useRef<HTMLLIElement | null>(null)
    const triggerWrapperRef = hooks.useRef<HTMLSpanElement | null>(null)
    const hoveredRef = hooks.useRef(false)
    const focusedWithinRef = hooks.useRef(false)

    const interactive = hasSubmenu && openMode !== 'onRender'

    hooks.useCloseOnOutside(containerRef, interactive && isOpen, () => setIsOpen(false))

    const handleKeyDown = createEscapeToCloseHandler(
      interactive && isOpen,
      () => setIsOpen(false),
      () => triggerWrapperRef.current?.querySelector<HTMLElement>('button, a'),
    )

    const hoverHandlers = openMode === 'onHover' && interactive
      ? {
        onMouseEnter: () => {
          hoveredRef.current = true
          setIsOpen(true)
        },
        onMouseLeave: () => {
          hoveredRef.current = false
          if (!focusedWithinRef.current) setIsOpen(false)
        },
        // Capture-phase, not `onFocus`/`onBlur` — native `focus`/`blur` don't bubble, so a plain
        // `onFocus` here never fires when a descendant control is what's actually focused.
        // Confirmed empirically identical in both renderers.
        onFocusCapture: () => {
          focusedWithinRef.current = true
          setIsOpen(true)
        },
        onBlurCapture: (event: MenuFocusEvent) => {
          const next = event.relatedTarget as Node | null
          if (next && containerRef.current?.contains(next)) return
          focusedWithinRef.current = false
          if (!hoveredRef.current) setIsOpen(false)
        },
      }
      : {}

    const decorativeVisual = icon ? Icon({ ...icon, label: undefined }) : visual ? visual() : null

    // The item's own visible content — a plain label, or the decorative visual (icon or the
    // caller's own `visual()`) plus the label — the exact same shape regardless of whether this
    // ends up inside a `Link`, a `Button`, or a plain `<span>` below. Never composes `ImgButton`:
    // that would reach into a real cross-package dependency this component has no need for once
    // the visual is already a caller-supplied element (see `MenuRenderItem.visual`'s own doc).
    const content = decorativeVisual ? [decorativeVisual, h('span', {}, label)] : label

    let primary: E
    let disclosureToggle: E | null = null

    if (!hasSubmenu || openMode === 'onRender') {
      primary = hasUrl
        ? Link({ href: url, external, rel, title, label: accessibleName, children: content })
        : h('span', {}, content)
    } else if (hasUrl) {
      // Two controls: a real navigable Link, plus a separate, bare disclosure Button.
      primary = Link({ href: url, external, rel, title, label: accessibleName, children: content })

      disclosureToggle = h(
        'span',
        { ref: triggerWrapperRef, key: 'toggle' },
        Button({
          onClick: openMode === 'onClick' ? () => setIsOpen((current) => !current) : undefined,
          label: `${accessibleName ?? label} submenu`,
          'aria-expanded': isOpen,
          'aria-controls': submenuId,
        }),
      )
    } else {
      // One control: both the item's own visual and its disclosure trigger.
      primary = h(
        'span',
        { ref: triggerWrapperRef },
        Button({
          onClick: openMode === 'onClick' ? () => setIsOpen((current) => !current) : undefined,
          label: accessibleName,
          'aria-expanded': isOpen,
          'aria-controls': submenuId,
          children: content,
        }),
      )
    }

    const nestedList = hasSubmenu && isOpen
      ? h(
        'ul',
        { id: submenuId, 'data-space-ui': 'menu-submenu', key: 'submenu' },
        (submenu ?? []).map((child, index) =>
          hAny(MenuItemRow, {
            key: child.url ?? `${child.label}-${index}`,
            item: child,
            openMode,
          })
        ),
      )
      : null

    return h(
      'li',
      {
        ref: containerRef,
        'data-space-ui': 'menu-item',
        onKeyDown: interactive ? handleKeyDown : undefined,
        ...hoverHandlers,
      },
      [hAny(Fragment, { key: 'primary' }, primary), disclosureToggle, nestedList],
    )
  }

  return function Menu(props: MenuRenderProps<E>): E {
    const {
      items,
      openMode = 'onClick',
      toggle = false,
      defaultOpen = false,
      open: controlledOpen,
      onOpenChange,
      label,
      id,
      className,
    } = props
    // Derived from `label` (Menu's own required accessible name) — same reasoning as `submenuId`.
    const listId = deriveStableCometId(label, 'menu-list')
    const isControlled = controlledOpen !== undefined
    const [internalOpen, setInternalOpen] = hooks.useState(defaultOpen)
    const isOpen = !toggle || (isControlled ? controlledOpen : internalOpen)
    const navRef = hooks.useRef<HTMLElement | null>(null)
    const toggleWrapperRef = hooks.useRef<HTMLSpanElement | null>(null)

    const setOpen = (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    }

    hooks.useCloseOnOutside(navRef, toggle && isOpen, () => setOpen(false))

    const handleToggleClick = () => setOpen(!isOpen)

    const handleKeyDown = createEscapeToCloseHandler(
      toggle && isOpen,
      () => setOpen(false),
      () => toggleWrapperRef.current?.querySelector<HTMLButtonElement>('button'),
    )

    const toggleButton = toggle
      ? h(
        'span',
        { ref: toggleWrapperRef, key: 'toggle' },
        Button({
          onClick: handleToggleClick,
          label: isOpen ? 'Close menu' : 'Open menu',
          'aria-expanded': isOpen,
          'aria-controls': listId,
        }),
      )
      : null

    const list = !toggle || isOpen
      ? h(
        'ul',
        { id: listId, 'data-space-ui': 'menu-list', key: 'list' },
        items.map((item, index) =>
          hAny(MenuItemRow, {
            key: item.url ?? `${item.label}-${index}`,
            item,
            openMode,
          })
        ),
      )
      : null

    return h(
      'nav',
      {
        id,
        className,
        ref: navRef,
        'aria-label': label,
        'data-space-ui': 'menu',
        onKeyDown: handleKeyDown,
      },
      [toggleButton, list],
    )
  }
}
