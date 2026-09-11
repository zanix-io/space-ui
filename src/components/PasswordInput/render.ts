import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createInput } from '../Input/render.ts'
import type { InputHooks } from '../Input/render.ts'
import type { PasswordInputBaseProps } from './types.ts'

/** {@linkcode InputHooks} — this component needs no hook of its own beyond the one `Input` (its
 * own composed instance) and this component's own uncontrolled `visible` fallback both need. */
export type PasswordInputHooks = InputHooks

/** {@linkcode PasswordInputBaseProps} plus `showIcon`/`hideIcon`, generic over the renderer's own
 * node type — `index.ts`/`index.preact.ts` each instantiate this as their own public
 * `PasswordInputProps`, same split `CardRenderProps<Node>` already establishes. */
export type PasswordInputRenderProps<Node> = PasswordInputBaseProps & {
  /** Render-prop slot for the icon shown while the field is MASKED (an invitation to reveal it) —
   * same calling convention as `Card.visual`/`ImgButton.visual` (`() => Node`, an already-built
   * element, never a data shape this component resolves itself). Defaults to this file's own
   * inline "eye" glyph when omitted. */
  showIcon?: () => Node
  /** Render-prop slot for the icon shown while the field is REVEALED (an invitation to re-mask
   * it). Defaults to this file's own inline "eye-off" glyph when omitted. */
  hideIcon?: () => Node
}

/** The `data-*` attribute marking every stroked path/circle in this component's own default
 * "eye"/"eye-off" icons, paired with {@linkcode PASSWORD_INPUT_STROKE_CSS} below, instead of an
 * inline `style` attribute — a real, confirmed CSP violation under a nonce-based `style-src`
 * (`@zanix/space`'s own zero-config default is exactly this shape): a CSP nonce never applies to a
 * `style="..."` attribute, only to a `<style>` element, and both React's and Preact's own `style`
 * PROP application go through that same attribute-level mechanism internally (see
 * `overlay-position-css.ts`'s own module doc for the full reasoning, identical cause). */
const STROKE_ICON_ATTR = 'data-space-ui-password-stroke'

/**
 * `stroke-width`/`stroke-linecap`/`stroke-linejoin` all have a hyphenated real DOM attribute name —
 * React accepts and correctly remaps the camelCase prop form for these via its own internal SVG
 * attribute table, but Preact does NOT (confirmed empirically): it sets the literal camelCase prop
 * name as the DOM attribute verbatim, an attribute no SVG renderer recognizes, silently no-opping
 * every one of them (see `Countdown/render.ts`'s own doc for the full empirical confirmation of the
 * identical divergence). Real CSS text, applied via {@linkcode STROKE_ICON_ATTR} and a self-rendered
 * `<style nonce={nonce}>` element, sidesteps this entirely — a real CSS declaration has nothing to
 * do with either renderer's own DOM-attribute special-casing, and needs no numeric-unit handling of
 * its own either (`1.6px` is written as real CSS text, not a JS value either renderer could
 * reinterpret).
 */
const PASSWORD_INPUT_STROKE_CSS =
  `[${STROKE_ICON_ATTR}]{stroke-width:1.6px;stroke-linecap:round;stroke-linejoin:round}`

function createDefaultEyeIcon<E>(h: CreateElement<E>): () => E {
  return function DefaultEyeIcon(): E {
    return h(
      'svg',
      { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z',
        fill: 'none',
        stroke: 'currentColor',
        [STROKE_ICON_ATTR]: '',
      }),
      h('circle', {
        cx: 12,
        cy: 12,
        r: 3,
        fill: 'none',
        stroke: 'currentColor',
        [STROKE_ICON_ATTR]: '',
      }),
    )
  }
}

function createDefaultEyeOffIcon<E>(h: CreateElement<E>): () => E {
  return function DefaultEyeOffIcon(): E {
    return h(
      'svg',
      { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M2 12s3.6-7 10-7c1.9 0 3.5.5 4.9 1.2M22 12s-3.6 7-10 7c-1.9 0-3.5-.5-4.9-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2',
        fill: 'none',
        stroke: 'currentColor',
        [STROKE_ICON_ATTR]: '',
      }),
      h('path', {
        d: 'M4 4l16 16',
        fill: 'none',
        stroke: 'currentColor',
        [STROKE_ICON_ATTR]: '',
      }),
    )
  }
}

const defaultToggleLabel = (visible: boolean): string => visible ? 'Hide password' : 'Show password'

/**
 * The real implementation of `PasswordInput`, shared identically between the React and Preact
 * bindings — composes the unmodified `Input` (via `Input/render.ts`'s own `createInput`, never
 * reimplemented) for the actual text entry, plus a real `Button` for the visibility toggle — same
 * "composed, not reimplemented" rule `MultiSelect`'s own chip remove control already establishes:
 * both inherit their own `data-space-ui` hook (`"input"`/`"button"`) unmodified, this component
 * adds only its own wrapping `data-space-ui="password-input"`.
 *
 * `changeEventProp` is threaded straight through to the composed `Input` — the same real, confirmed
 * `onChange`/`onInput` React/Preact divergence `Input/render.ts`'s own doc establishes in full
 * applies identically here, since the underlying element is still a plain live-typing `<input>`;
 * this file adds no second divergence of its own.
 *
 * ## Never breaks native autofill or a password manager
 *
 * The one thing that makes a show/hide toggle safe for autofill: this component only ever flips the
 * real `<input>`'s own `type` attribute (`'password'` ↔ `'text'`) — the exact, standard technique
 * every password manager and the browser's own native autofill already recognize; `autoComplete`
 * passes straight through {@linkcode PasswordInputBaseProps} unchanged (typically
 * `'current-password'`/`'new-password'`), and `name`/`value`/`id` are never touched or renamed by
 * this component. No client-side masking trick, no second shadow input — a real, single native
 * `<input>` throughout, always the same DOM node.
 *
 * ## Toggle button: `type="button"`, never submits the form
 *
 * `Button`'s own default `type` is already `'button'` (see `Button/render.ts`), so this needs no
 * override — called out here explicitly because a REGRESSION here (accidentally leaving `type`
 * unset on a button living inside a `<form>`, where the HTML default for an unset `type` is actually
 * `'submit'`) would be a real, silent, easy-to-miss bug: `Button`'s own factory sets `type = 'button'`
 * as its own default specifically so composing it, as this component does, never needs to remember to
 * repeat that override at every call site.
 */
export function createPasswordInput<E>(
  h: CreateElement<E>,
  hooks: PasswordInputHooks,
  changeEventProp: 'onChange' | 'onInput',
): (props: PasswordInputRenderProps<E>) => E {
  const Input = createInput<E>(h, hooks, changeEventProp)
  const Button = createButton<E>(h)
  const DefaultEyeIcon = createDefaultEyeIcon(h)
  const DefaultEyeOffIcon = createDefaultEyeOffIcon(h)

  return function PasswordInput(props: PasswordInputRenderProps<E>): E {
    const {
      visible: controlledVisible,
      defaultVisible = false,
      onVisibleChange,
      getToggleLabel = defaultToggleLabel,
      showIcon,
      hideIcon,
      nonce,
      ...inputProps
    } = props

    const isControlled = controlledVisible !== undefined
    const [internalVisible, setInternalVisible] = hooks.useState(defaultVisible)
    const visible = isControlled ? controlledVisible : internalVisible

    const toggleVisible = () => {
      const next = !visible
      if (!isControlled) setInternalVisible(next)
      onVisibleChange?.(next)
    }

    return h(
      'span',
      { 'data-space-ui': 'password-input' },
      // Backs `STROKE_ICON_ATTR` on the default eye/eye-off icons — a self-rendered
      // `<style nonce={nonce}>` element, never an inline `style` attribute (see this module's own
      // top-of-file doc). Rendered unconditionally: harmless even when `showIcon`/`hideIcon` are
      // both given and this component's own default icons never actually render.
      h('style', { key: 'style', nonce }, PASSWORD_INPUT_STROKE_CSS),
      Input({ ...inputProps, type: visible ? 'text' : 'password' }),
      Button({
        type: 'button',
        onClick: toggleVisible,
        label: getToggleLabel(visible),
        children: visible
          ? (hideIcon ? hideIcon() : DefaultEyeOffIcon())
          : (showIcon ? showIcon() : DefaultEyeIcon()),
      }),
    )
  }
}
