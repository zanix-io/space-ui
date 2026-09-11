import { Fragment, h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { usePosition } from 'shared/use-position.preact.ts'
import { createDatePicker } from './render.ts'
import type { DatePickerBaseProps } from './types.ts'

/** {@linkcode DatePickerBaseProps} — nothing extra for the Preact binding. */
export type DatePickerProps = DatePickerBaseProps

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (the year-selection view this
 * component exists for, why the trigger is never a free-text field, why the day grid is a real
 * roving-tabindex `role="grid"` unlike `Select`'s/`Combobox`'s own `aria-activedescendant`, the
 * single internal `cursor` doing double duty, deterministic-first-render via a mount-only `today`
 * effect, why ids are derived via a hash rather than `useId()`/`useCometStableId()`, the full
 * `withTime` contract, why `locale` is a plain prop rather than read from `useIntl()`) — not
 * repeated here. Same contract, same rendered behavior, real implementation shared with the React
 * binding via `render.ts`'s own `createDatePicker` — never `preact/compat`.
 */
export const DatePicker: (props: DatePickerProps) => VNode = createDatePicker<VNode>(
  h as unknown as CreateElement<VNode>,
  { useRef, useState, useMemo, useEffect, useLayoutEffect, useCloseOnOutside, usePosition },
  Fragment,
)
