import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createInput } from '../Input/render.ts'
import type { InputHooks } from '../Input/render.ts'
import { createDefaultCloseIcon } from 'shared/close-button-icon.ts'
import { detectSocialNetwork } from './detect-social-network.ts'
import { generateEntryId } from './generate-entry-id.ts'
import type { SocialLinkEntry, SocialLinksInputBaseProps } from './types.ts'

/** The subset of `useState`/`useRef` this component's shared body needs, injected alongside `h` —
 * same `render.ts`-factory technique `Menu`/`Table`/`Input` already use. `useRef` holds the id of an
 * entry just added via the "+" button, read back once by that ROW's own callback `ref` (see
 * `render.ts`'s own doc below) — a plain mutable ref, never itself a render trigger. */
export type SocialLinksInputHooks = InputHooks & {
  useRef: <T>(initial: T) => { current: T }
}

/** {@linkcode SocialLinksInputBaseProps} plus the one render-prop this binding's own node type
 * parametrizes — `index.ts`/`index.preact.ts` each instantiate this with `ReactNode`/
 * `ComponentChildren` (their own `SocialLinksInputProps`), same split `TableRenderColumn<Row,
 * Node>`'s own doc already establishes for `header`/`cell`. */
export type SocialLinksInputRenderProps<Node> = SocialLinksInputBaseProps & {
  /** Renders a row's own decorative network glyph — the caller's own choice of icon set, given the
   * already-detected `entry.network`; omit it and a row simply shows no icon. See `index.ts`'s own
   * doc, "Icon rendering", for why this is a render-prop rather than a bundled icon catalog. Always
   * wrapped in an `aria-hidden` container by this component regardless of what it returns — purely
   * decorative, never the row's own accessible name. */
  renderIcon?: (entry: SocialLinkEntry) => Node | null
}

function plusIcon<E>(h: CreateElement<E>): E {
  return h(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true', focusable: 'false' },
    h('path', {
      d: 'M7 1V13M1 7H13',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
    }),
  )
}

/**
 * The real implementation of `SocialLinksInput`, shared identically between the React and Preact
 * bindings — same `render.ts`-factory technique `Input`/`Table`/`Menu` already use, extended with
 * one more injected, non-hook parameter beyond `h`/`hooks`: `changeEventProp`, forwarded straight
 * through to the internally-composed `Input` (see `Input/render.ts`'s own doc for the full
 * `onChange`/`onInput` divergence this exists to isolate — this component never needs its own
 * per-renderer branch for it, since `Input` already owns that logic).
 *
 * Composes `Input` (each row's own URL field) and `Button` (each row's remove control, plus the
 * trailing "+" control) via their own `render.ts` factories — inherits `data-space-ui="input"`/
 * `"button"` on those elements, adding no redundant hook of its own beyond the root
 * `data-space-ui="social-links-input"`.
 *
 * ## Focusing a newly-added row without a per-renderer branch
 *
 * `Button`/`Input` are both plain function components (never `forwardRef`-wrapped — see
 * `Popover`'s/`Menu`'s own doc for why no component in this package exposes a ref that way), so the
 * "+" handler can't hold a direct ref to the row it's about to create. Instead it records the new
 * entry's own `id` in `pendingFocusIdRef` (a plain mutable ref, injected via `hooks.useRef`, never
 * itself a render trigger) and each row's own wrapping `<li>` carries a callback `ref`: when THAT
 * specific `<li>` mounts and its own id matches the pending one, it queries its own first `<input>`
 * and focuses it, then clears the pending id. A callback ref fires identically in React and Preact
 * (called with the real DOM node on mount, `null` on unmount) — no `useEffect` needed, and nothing
 * here differs between the two renderers.
 */
export function createSocialLinksInput<E>(
  h: CreateElement<E>,
  hooks: SocialLinksInputHooks,
  changeEventProp: 'onChange' | 'onInput',
): (props: SocialLinksInputRenderProps<E>) => E {
  const Input = createInput(h, hooks, changeEventProp)
  const Button = createButton(h)
  const CloseIcon = createDefaultCloseIcon(h)
  // `Input` (unlike `Button`/`CloseIcon` below) carries its own real internal hook (its own
  // uncontrolled-value `useState`, always called regardless of whether THIS component ends up
  // using it) — calling it as a bare function inside `values.map`'s dynamic-length loop would
  // inject a variable number of hook calls directly into `SocialLinksInput`'s own hook sequence,
  // a real violation of the Rules of Hooks the moment a row is added or removed (confirmed by a
  // failing test: "Rendered more/fewer hooks than during the previous render"). `h(Input, {...})`
  // gives each row's `Input` its own component instance with its own isolated hook list instead —
  // the same fix `Accordion/render.ts` already applies for its own composed, stateful `Disclosure`.
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function SocialLinksInput(props: SocialLinksInputRenderProps<E>): E {
    const {
      values: controlledValues,
      defaultValues = [],
      onValuesChange,
      max,
      placeholder,
      name,
      addButtonLabel = 'Add another social link',
      id,
      className,
      renderIcon,
    } = props

    const isControlled = controlledValues !== undefined
    const [internalValues, setInternalValues] = hooks.useState(defaultValues)
    const values = isControlled ? controlledValues : internalValues

    const pendingFocusIdRef = hooks.useRef<string | null>(null)

    function commit(next: SocialLinkEntry[]) {
      if (!isControlled) setInternalValues(next)
      onValuesChange?.(next)
    }

    function handleAdd() {
      if (max !== undefined && values.length >= max) return
      const entry: SocialLinkEntry = { id: generateEntryId(), url: '', network: null }
      pendingFocusIdRef.current = entry.id
      commit([...values, entry])
    }

    function handleRemove(entryId: string) {
      commit(values.filter((entry) => entry.id !== entryId))
    }

    function handleUrlChange(entryId: string, url: string) {
      const network = detectSocialNetwork(url)
      commit(values.map((entry) => entry.id === entryId ? { ...entry, url, network } : entry))
    }

    const atMax = max !== undefined && values.length >= max

    return h(
      'ul',
      { id, className, 'data-space-ui': 'social-links-input' },
      ...values.map((entry, index) => {
        const icon = renderIcon?.(entry) ?? null
        return h(
          'li',
          {
            key: entry.id,
            ref: (node: { querySelector(selector: string): { focus(): void } | null } | null) => {
              if (!node || pendingFocusIdRef.current !== entry.id) return
              pendingFocusIdRef.current = null
              node.querySelector('input')?.focus()
            },
          },
          icon === null ? null : h('span', { 'aria-hidden': true }, icon),
          hAny(Input, {
            type: 'url',
            value: entry.url,
            onValueChange: (url: string) => handleUrlChange(entry.id, url),
            placeholder,
            name: name ? `${name}_${index}` : undefined,
            'aria-label': `Social link ${index + 1}`,
          }),
          Button({
            onClick: () => handleRemove(entry.id),
            label: `Remove ${entry.url || 'this link'}`,
            children: CloseIcon(),
          }),
        )
      }),
      h(
        'li',
        // A stable, distinct `key` — without one, this trailing element's un-keyed position among
        // its keyed row siblings shifts every time a row is added/removed, which makes React treat
        // it as a different element (unmount the old one, mount a new one) instead of reusing the
        // existing DOM node across that re-render.
        { key: 'add' },
        Button({
          onClick: handleAdd,
          disabled: atMax,
          label: addButtonLabel,
          children: plusIcon(h),
        }),
      ),
    )
  }
}
