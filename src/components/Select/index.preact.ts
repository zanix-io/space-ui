import { h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { usePosition } from 'shared/use-position.preact.ts'
import { createSelect } from './render.ts'
import type { SelectBaseProps } from './types.ts'

/** {@linkcode SelectBaseProps} — nothing extra for the Preact binding. */
export type SelectProps = SelectBaseProps

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (the WAI-ARIA "Collapsible
 * Dropdown Listbox" pattern, why the trigger composes `Button` verbatim with no redundant hook,
 * why real focus moves onto the listbox itself via `aria-activedescendant` rather than roving
 * tabindex, automatic activation on arrow keys like `RadioGroup`/`Tabs` rather than `Combobox`'s
 * manual Enter-to-commit, why `useCloseOnOutside` scopes to a container wrapping both the trigger
 * and the listbox, why each option needs `onMouseDown` `preventDefault`, why the trigger is queried
 * fresh from an owned wrapper rather than ref-forwarded) — not repeated here. Same contract, same
 * rendered behavior, real implementation shared with the React binding via `render.ts`'s own
 * `createSelect` (hook injection — see that file's own doc for why that's sound) — never
 * `preact/compat`.
 */
export const Select: (props: SelectProps) => VNode = createSelect<VNode>(
  h as unknown as CreateElement<VNode>,
  { useId, useRef, useState, useMemo, useEffect, useCloseOnOutside, usePosition },
)
