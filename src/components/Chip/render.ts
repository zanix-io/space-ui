import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createDefaultCloseIcon } from 'shared/close-button-icon.ts'
import type { ChipBaseProps } from './types.ts'

/**
 * The real implementation of `Chip`, shared identically between the React and Preact bindings —
 * stateless, same `render.ts`-factory pattern `Icon`/`Alert`/`Skeleton` already establish (no
 * hooks needed at all: whether the remove control renders is a pure function of
 * {@linkcode ChipBaseProps.onRemove}'s own presence, nothing this component tracks itself).
 *
 * Composes a real `Button` for the remove control — inherits its own `data-space-ui="button"`
 * hook, never a redundant one — with `shared/close-button-icon.ts`'s own default inline "X" `<svg>`
 * as its visible glyph, the exact same composition `MultiSelect`'s own chip remove control already
 * uses (`aria-label="Remove {label}"`, the same default glyph `Modal`/`Drawer`/`Toast` render for
 * their own close buttons). `MultiSelect` itself is NOT refactored to compose this component in
 * this change — a real, disclosed deviation: `MultiSelect`'s own chip is entangled with state
 * (`baseId`-derived per-chip ids, `values`/`removeValue` closures) this standalone, stateless
 * component has no equivalent for, and refactoring a widely-used, already-shipped component's
 * internal markup carries real regression risk without a dedicated review pass of its own test
 * suite — flagged as a follow-up design question, not attempted speculatively here.
 *
 * `data-tone` is a plain, verbatim passthrough of {@linkcode ChipBaseProps.tone} — this component
 * neither ships nor assumes any color mapping for it (see that prop's own doc for the full
 * reasoning).
 */
export function createChip<E>(h: CreateElement<E>): (props: ChipBaseProps) => E {
  const Button = createButton<E>(h)
  const DefaultCloseIcon = createDefaultCloseIcon(h)

  return function Chip(props: ChipBaseProps): E {
    const { label, tone = 'neutral', onRemove, removeLabel, id, className } = props

    return h(
      'span',
      { id, className, 'data-space-ui': 'chip', 'data-tone': tone },
      h('span', { 'data-space-ui': 'chip-label' }, label),
      onRemove
        ? Button({
          type: 'button',
          onClick: onRemove,
          label: removeLabel ?? `Remove ${label}`,
          children: DefaultCloseIcon(),
        })
        : null,
    )
  }
}
