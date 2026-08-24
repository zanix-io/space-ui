import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createIcon } from '../Icon/render.ts'
import { createImage } from '../Image/render.ts'
import { createImgButton } from '../ImgButton/render.ts'
import { createLink } from '../Link/render.ts'
import { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'
import type { MenuItem, MenuOpenMode, MenuProps } from './types.ts'

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here). Wider than
 * `Table`'s bag (`useId`/`useRef` alongside `useState`), but every one of these is still only ever
 * called at this component's own top level, in the same order, every render — never conditionally,
 * never inside a loop — so the same call-order-keying argument applies unchanged.
 *
 * `useCloseOnOutside` is itself injected too, not imported directly — it's already a per-renderer
 * pair (`shared/close-on-outside.ts`/`.preact.ts`, each built on that renderer's own
 * `useEffect`/`useRef`), so `index.ts`/`index.preact.ts` each pass their own already-bound one in,
 * the same way each passes its own `useState`.
 */
export type MenuHooks = {
  useId: () => string
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
 * The real implementation of `Menu`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`, extended with a wider hook bag (see {@linkcode MenuHooks}'s
 * own doc). Composes the real `Button`/`Link`/`ImgButton`/`Icon`/`Image` (via their own `render.ts`
 * factories, bound to the same `h`) — inherits their own `data-space-ui` hooks on the elements they
 * render, never a redundant one of its own; the root `<nav>` itself carries `data-space-ui="menu"`.
 *
 * ## `Fragment`, applied unconditionally
 *
 * The component this was extracted from wrapped `primary` in a keyed `Fragment` specifically to
 * silence a React-only dev-mode "missing key" console warning (`primary` comes from several
 * different branches, none of which accept a `key` prop through their own already-closed types);
 * Preact never warns for that shape, so its own hand-written binding used to skip the wrapper. Both
 * are harmless either way (a redundant `Fragment` around one child renders identically) — so the
 * shared body here applies it unconditionally rather than needing a per-renderer branch, the same
 * resolution `space-ui-component-patterns` documents for this exact wrinkle. `Fragment` itself is
 * injected as its own parameter (not a hook, so not part of {@linkcode MenuHooks}) since
 * `CreateElement`'s own `type` parameter is typed as `string` only — calling `h` with a component
 * reference instead needs the same kind of widening cast `index.ts`'s own `Menu` binding doc already
 * names for other components, done once here rather than at every call site.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (structure, `toggle`, per-item
 * control shape, `ImgButton` vs. direct composition, `openMode`, closing) — not repeated here.
 */
export function createMenu<E>(
  h: CreateElement<E>,
  hooks: MenuHooks,
  Fragment: unknown,
): (props: MenuProps) => E {
  const Button = createButton(h)
  const Link = createLink(h)
  const ImgButton = createImgButton(h)
  const Icon = createIcon(h)
  const Image = createImage(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  function MenuItemRow({ item, openMode }: { item: MenuItem; openMode: MenuOpenMode }): E {
    const { label, url, external, rel, title, accessibleLabel, icon, image, submenu } = item
    const hasSubmenu = !!submenu?.length
    const hasUrl = url !== undefined
    const hasVisual = !!(icon || image)
    const accessibleName = accessibleLabel

    const submenuId = hooks.useId()
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

    const decorativeVisual = icon
      ? Icon({ ...icon, label: undefined })
      : image
      ? Image({ ...image, alt: '' })
      : null

    let primary: E
    let disclosureToggle: E | null = null

    if (!hasSubmenu || openMode === 'onRender') {
      if (hasUrl) {
        primary = hasVisual
          ? ImgButton({
            href: url,
            external,
            rel,
            title,
            label: accessibleName ?? label,
            icon,
            image,
            caption: label,
          })
          : Link({ href: url, external, rel, title, label: accessibleName, children: label })
      } else {
        primary = h('span', {}, decorativeVisual ? [decorativeVisual, label] : label)
      }
    } else if (hasUrl) {
      // Two controls: a real navigable Link, plus a separate, bare disclosure Button.
      primary = hasVisual
        ? ImgButton({
          href: url,
          external,
          rel,
          title,
          label: accessibleName ?? label,
          icon,
          image,
          caption: label,
        })
        : Link({ href: url, external, rel, title, label: accessibleName, children: label })

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
          children: decorativeVisual ? [decorativeVisual, h('span', {}, label)] : label,
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

  return function Menu(props: MenuProps): E {
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
    const listId = hooks.useId()
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
