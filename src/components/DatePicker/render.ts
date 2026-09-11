import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createIcon } from '../Icon/render.ts'
import { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'
import type { ComputePositionOptions, ComputePositionResult } from 'shared/positioning.ts'
import { deriveStableCometId } from 'shared/stable-comet-id.ts'
import {
  buildOverlayCss,
  DISPLAY_CONTENTS_WRAPPER_ATTR,
  DISPLAY_CONTENTS_WRAPPER_CSS,
  getOrInsertDynamicRule,
  removeDynamicRule,
} from 'shared/overlay-position-css.ts'
import type { CalendarDate } from './date-utils.ts'
import {
  addDays,
  addMonths,
  addYears,
  daysInMonth,
  formatDisplayValue,
  formatISODate,
  formatISODateTime,
  getCalendarGrid,
  getMonthNames,
  getTodayLocal,
  getWeekdayNames,
  getYearPageStart,
  isDateDisabled,
  isMonthDisabled,
  isSameDate,
  isYearDisabled,
  parseISODate,
  parseISODateTime,
  wrapValue,
} from './date-utils.ts'
import type { DatePickerBaseProps } from './types.ts'

/** Minimal structural shape both `React.KeyboardEvent` and Preact's own native `KeyboardEvent`
 * satisfy — this file never imports React or Preact, same reasoning `shared/escape-to-close.ts`'s
 * own `EscapeKeyEvent` and `shared/roving-focus.ts`'s own `NavigationKeyEvent` already document. */
type DatePickerKeyEvent = {
  key: string
  shiftKey: boolean
  preventDefault(): void
  stopPropagation(): void
}

/** Which sub-view the popup currently shows — internal-only state, never part of the public
 * controlled contract (no consumer evidence has asked to drive it from outside, the same bar
 * `Combobox`'s own internal `activeIndex` is held to). */
type DatePickerView = 'days' | 'months' | 'years'

/**
 * The static, non-dynamic part of this component's own panel positioning — same
 * `buildOverlayCss`/nonce'd-`<style>` pattern `Select/render.ts`'s own `SELECT_LISTBOX_POSITION_CSS`
 * already establishes (see that file's own doc, and `shared/overlay-position-css.ts`'s, for the
 * full CSP reasoning — the previous version of this file's own `position:'fixed'`/`transform`
 * object literal on the panel `<div>` was a real, confirmed violation of a nonce-based `style-src`
 * CSP).
 */
const DATE_PICKER_PANEL_POSITION_CSS: string = buildOverlayCss('date-picker-panel', {
  position: 'fixed',
  top: 0,
  left: 0,
  margin: 0,
  padding: 0,
  visibility: 'hidden',
})

/**
 * The hooks/primitives this component's shared body needs, injected alongside `h` — same shape
 * `Select/render.ts`'s own `SelectHooks` establishes (see that file's own doc for the full
 * soundness reasoning, not repeated here). No `useId` — see `index.ts`'s own doc, "Ids: derived
 * from props, never `useId()`", for why: this component is architecturally required to stay
 * dependency-free from `@zanix/space` (root-barrel, not `./runtime/*`), so it can't reach for
 * `useCometStableId` either — `shared/stable-comet-id.ts`'s own hash, the same technique `Menu`
 * already established for the identical reason, is used instead.
 */
export type DatePickerHooks = {
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useMemo: <T>(fn: () => T, deps: unknown[]) => T
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  /** For the dynamic-positioning CSSOM rule application — see `createDatePicker`'s own doc and
   * `Select/render.ts`'s own identical injection (not repeated here). */
  useLayoutEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useCloseOnOutside: (
    ref: { current: HTMLElement | null },
    active: boolean,
    onClose: () => void,
  ) => void
  usePosition: (
    referenceRef: { current: Element | null },
    floatingRef: { current: Element | null },
    active: boolean,
    options?: ComputePositionOptions,
  ) => ComputePositionResult | null
}

/**
 * The real implementation of `DatePicker`, shared identically between the React and Preact
 * bindings — same pattern as `Select/render.ts`. Composes the real `Button` (via its own
 * `render.ts` factory, bound to the same `h`) for the trigger and every single-instance popup
 * control (prev/next arrows, the month-name/year-name header buttons, the `withTime` "Done"
 * button) — each inherits `Button`'s own `data-space-ui="button"` hook, no redundant one of its
 * own. The 12-cell month/year GRID buttons are plain native `<button>` elements instead (never
 * `Button`, whose props type has no `key` field — see this file's own inline comment at their call
 * site) — `data-space-ui="date-picker-month"`/`"date-picker-year"` respectively.
 *
 * See `index.ts`'s own doc for the full public behavioral contract — not repeated here.
 */
export function createDatePicker<E>(
  h: CreateElement<E>,
  hooks: DatePickerHooks,
  Fragment: unknown,
): (props: DatePickerBaseProps) => E {
  const Button = createButton(h)
  const Icon = createIcon(h)
  // `Fragment` is injected as its own parameter (not a hook) for the same reason
  // `RadioGroup/render.ts` documents — needed so each composed `Button` inside a fixed header
  // array can still carry a real `key` (`ButtonProps` itself has no `key` field), the same
  // missing-key fix `Modal`/`Drawer`/`Toast/render.ts` already needed for their own composed,
  // factory-produced children.
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function DatePicker(props: DatePickerBaseProps): E {
    const {
      value: controlledValue,
      defaultValue = null,
      onValueChange,
      min,
      max,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      placement = 'bottom',
      offset = 8,
      placeholder,
      label,
      icon,
      withTime = false,
      hourCycle = 'h24',
      locale = 'en',
      id,
      className,
      nonce,
    } = props

    // Derived purely from already-identical-both-sides props (never render order/a counter/
    // `Math.random()`) — see `DatePickerHooks`'s own doc for why this can't be `useId()`/
    // `useCometStableId()` here. The residual (two DatePickers sharing the exact same `id`/
    // `placeholder`/`min`/`max`/`withTime` colliding on id) is the same accepted, narrow trade-off
    // `Menu`'s own `deriveStableCometId` doc already documents for the overwhelmingly common case
    // of distinct props.
    const seed = JSON.stringify({ id, placeholder, min, max, withTime })
    const baseId = deriveStableCometId(seed, 'date-picker')
    const panelId = `${baseId}-panel`

    const minDate = parseISODate(min)
    const maxDate = parseISODate(max)

    const isValueControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = hooks.useState(defaultValue)
    const value = isValueControlled ? controlledValue : internalValue

    const isOpenControlled = controlledOpen !== undefined
    const [internalOpen, setInternalOpen] = hooks.useState(defaultOpen)
    const open = isOpenControlled ? controlledOpen : internalOpen

    const setValue = (next: string | null) => {
      if (!isValueControlled) setInternalValue(next)
      onValueChange?.(next)
    }
    const setOpen = (next: boolean) => {
      if (!isOpenControlled) setInternalOpen(next)
      onOpenChange?.(next)
    }

    const parsedDateTime = withTime ? parseISODateTime(value) : null
    const parsedDateOnly = withTime ? null : parseISODate(value)
    const selectedDate = withTime ? (parsedDateTime?.date ?? null) : parsedDateOnly
    const selectedHour = parsedDateTime?.hour ?? 0
    const selectedMinute = parsedDateTime?.minute ?? 0

    // `null` until the first post-mount effect below — never read during render itself. This is
    // what keeps SSR/first-client-paint deterministic (seam 6) despite "what month should an
    // empty, freshly-opened picker show" genuinely depending on the current date: see
    // `date-utils.ts`'s own `getTodayLocal` doc.
    const [today, setToday] = hooks.useState<CalendarDate | null>(null)
    hooks.useEffect(() => {
      setToday(getTodayLocal())
    }, [])

    const [view, setView] = hooks.useState<DatePickerView>('days')
    // `null` until the caller navigates (prev/next month/year, a month/year pick) — re-derived
    // fresh from `selectedDate`/`today` on every popup re-open instead (see the effect below),
    // the same "derive from the current value, don't let stale internal state leak across
    // sessions" reasoning `Select`'s own `activeIndex` derivation already follows.
    const [internalCursor, setInternalCursor] = hooks.useState<CalendarDate | null>(null)
    const [internalYearPageStart, setInternalYearPageStart] = hooks.useState<number | null>(null)

    const cursor: CalendarDate = internalCursor ?? selectedDate ?? today ??
      { year: 1970, month: 1, day: 1 }
    const yearPageStart = internalYearPageStart ?? getYearPageStart(cursor.year)

    hooks.useEffect(() => {
      if (!open) return
      setView('days')
      setInternalCursor(null)
      setInternalYearPageStart(null)
    }, [open])

    const triggerWrapperRef = hooks.useRef<HTMLSpanElement | null>(null)
    const panelRef = hooks.useRef<HTMLDivElement | null>(null)
    const containerRef = hooks.useRef<HTMLSpanElement | null>(null)
    // Set by whichever cell/button currently represents `cursor` in the ACTIVE view — a plain ref
    // callback conditionally assigned per rendered item (see the day/month/year cell render code
    // below), read only from the focus-follow effect further down. Simpler than querying the DOM
    // by a bespoke attribute, and avoids relying on `tabIndex="0"` alone (months/years cells stay
    // individually Tab-reachable, like `Accordion`'s own headers — see `index.ts`'s own doc for
    // why they're deliberately NOT roving-tabindex).
    const focusTargetRef = hooks.useRef<HTMLElement | null>(null)
    const styleElRef = hooks.useRef<HTMLStyleElement | null>(null)
    const dynamicRuleRef = hooks.useRef<CSSStyleRule | null>(null)

    // Same technique `Select/render.ts`'s own `referenceRef` already establishes: `Button` can't
    // take a `ref` directly, so this is a stable object whose `.current` is always the LIVE
    // trigger element, queried fresh from an owned wrapper.
    const referenceRef = hooks.useMemo(() => ({
      get current() {
        return triggerWrapperRef.current?.firstElementChild ?? null
      },
    }), [])
    const getTriggerElement = () => triggerWrapperRef.current?.querySelector<HTMLElement>('button')

    const position = hooks.usePosition(referenceRef, panelRef, open, { placement, offset })

    // The dynamic-positioning CSSOM rule — see `DATE_PICKER_PANEL_POSITION_CSS`'s own doc and
    // `Select/render.ts`'s own identical effect (not repeated here). Scoped to THIS instance via
    // `panelId` (stable for the component's lifetime), same reasoning `Select`'s own
    // `dynamicSelector` documents. Keyed on `open` since this component's own panel `<style>`
    // element unmounts whenever the panel itself does.
    const dynamicSelector = `[data-space-ui='date-picker-panel'][data-date-picker-id='${panelId}']`
    hooks.useLayoutEffect(() => {
      if (!open) return
      const styleEl = styleElRef.current
      if (!styleEl) return
      getOrInsertDynamicRule(styleEl, dynamicRuleRef, dynamicSelector)
      return () => removeDynamicRule(styleEl, dynamicRuleRef)
    }, [open])

    // Applies the CSSOM rule's own `transform`/`visibility` on every position update —
    // `useLayoutEffect`, not `useEffect`, so this runs synchronously before the browser paints,
    // same reasoning `Select`'s own identical effect documents.
    hooks.useLayoutEffect(() => {
      const rule = dynamicRuleRef.current
      if (!rule) return
      rule.style.setProperty(
        'transform',
        position ? `translate(${position.x}px, ${position.y}px)` : '',
      )
      rule.style.setProperty('visibility', position ? 'visible' : 'hidden')
    }, [position])

    hooks.useCloseOnOutside(containerRef, open, () => setOpen(false))

    // Moves real focus onto whichever cell/button `focusTargetRef` currently points at — on open,
    // on a view switch, and on any `cursor` change (arrow-key day navigation, prev/next month/
    // year). Keyed on `formatISODate(cursor)` (a plain string, not the `cursor` object itself) —
    // the same "never a fresh object literal in a dependency array" discipline `Popover`'s own
    // `usePosition` bug fix already established, applied here to this component's own effect.
    const cursorKey = formatISODate(cursor)
    hooks.useEffect(() => {
      if (!open) return
      focusTargetRef.current?.focus()
    }, [open, view, cursorKey])

    const closeAndRefocus = () => {
      setOpen(false)
      getTriggerElement()?.focus()
    }

    const escapeHandler = createEscapeToCloseHandler(open, () => setOpen(false), getTriggerElement)

    const commitDay = (date: CalendarDate) => {
      if (isDateDisabled(date, minDate, maxDate)) return
      setInternalCursor(date)
      setValue(
        withTime ? formatISODateTime(date, selectedHour, selectedMinute) : formatISODate(date),
      )
      if (!withTime) closeAndRefocus()
    }

    // Time adjustment is only meaningful once a real day is already selected — see `index.ts`'s
    // own "Time-of-day selection" doc for why this is a deliberate scope choice, not an oversight.
    const timeDisabled = !selectedDate
    const commitTime = (hour: number, minute: number) => {
      if (!selectedDate) return
      setValue(formatISODateTime(selectedDate, hour, minute))
    }

    const handleDaysGridKeyDown = (event: DatePickerKeyEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        commitDay(cursor)
        return
      }

      let next: CalendarDate | null = null
      if (event.key === 'PageUp') {
        next = event.shiftKey ? addYears(cursor, -1) : addMonths(cursor, -1)
      } else if (event.key === 'PageDown') {
        next = event.shiftKey ? addYears(cursor, 1) : addMonths(cursor, 1)
      } else if (event.key === 'ArrowLeft') next = addDays(cursor, -1)
      else if (event.key === 'ArrowRight') next = addDays(cursor, 1)
      else if (event.key === 'ArrowUp') next = addDays(cursor, -7)
      else if (event.key === 'ArrowDown') next = addDays(cursor, 7)
      else if (event.key === 'Home') next = { ...cursor, day: 1 }
      else if (event.key === 'End') {
        next = { ...cursor, day: daysInMonth(cursor.year, cursor.month) }
      }

      if (!next) return
      event.preventDefault()
      setInternalCursor(next)
    }

    const monthNames = getMonthNames(locale)
    const weekdayNames = getWeekdayNames(locale)

    // --- Trigger -------------------------------------------------------------------------------

    const triggerText = selectedDate
      ? formatDisplayValue(
        selectedDate,
        locale,
        withTime ? { hour: selectedHour, minute: selectedMinute } : null,
        hourCycle,
      )
      : (placeholder ?? '')

    // Same icon+text composition `ImgButton.icon`/`.caption` already establishes: given an icon,
    // `children` becomes a short array (icon + text span) rather than the bare string — the same
    // accepted missing-`key` trade-off that composition documents (rebuilt fresh from props on
    // every render, no internal state either item could lose).
    const triggerChildren = icon
      ? [Icon(icon), h('span', { key: 'text' }, triggerText)]
      : triggerText

    const trigger = h(
      'span',
      { key: 'trigger', ref: triggerWrapperRef, [DISPLAY_CONTENTS_WRAPPER_ATTR]: '' },
      Button({
        id,
        className,
        label,
        'aria-expanded': open,
        'aria-controls': panelId,
        onClick: () => setOpen(!open),
        children: triggerChildren,
      }),
    )

    // Unconditional (rendered in both the closed-early-return branch below and the full open
    // render further down) — backs EVERY `[DISPLAY_CONTENTS_WRAPPER_ATTR]` marker this file renders
    // (the trigger wrapper, the container span, and each view's own header wrapper), same reasoning
    // `Select/render.ts`'s own `wrapperStyleEl` documents: one static rule, not re-derived per site.
    const wrapperStyleEl = h('style', { key: 'wrapper-style', nonce }, DISPLAY_CONTENTS_WRAPPER_CSS)

    if (!open) {
      return h(
        'span',
        { ref: containerRef, [DISPLAY_CONTENTS_WRAPPER_ATTR]: '' },
        [trigger, wrapperStyleEl, null],
      )
    }

    // --- Days view -------------------------------------------------------------------------------

    const daysHeader = h('span', { key: 'header', [DISPLAY_CONTENTS_WRAPPER_ATTR]: '' }, [
      hAny(
        Fragment,
        { key: 'prev-month' },
        Button({
          label: 'Previous month',
          onClick: () => setInternalCursor(addMonths(cursor, -1)),
          children: '‹',
        }),
      ),
      hAny(
        Fragment,
        { key: 'month-name' },
        Button({ onClick: () => setView('months'), children: monthNames[cursor.month - 1] }),
      ),
      hAny(
        Fragment,
        { key: 'year-name' },
        Button({
          onClick: () => {
            setInternalYearPageStart(getYearPageStart(cursor.year))
            setView('years')
          },
          children: String(cursor.year),
        }),
      ),
      hAny(
        Fragment,
        { key: 'next-month' },
        Button({
          label: 'Next month',
          onClick: () => setInternalCursor(addMonths(cursor, 1)),
          children: '›',
        }),
      ),
    ])

    const weekdayHeaderRow = h(
      'div',
      { key: 'weekdays', role: 'row' },
      weekdayNames.map((name, index) => h('div', { key: index, role: 'columnheader' }, name)),
    )

    const dayCells = getCalendarGrid(cursor.year, cursor.month)
    const dayRows = []
    for (let week = 0; week < 6; week++) {
      const weekCells = dayCells.slice(week * 7, week * 7 + 7)
      dayRows.push(
        h(
          'div',
          { key: `week-${week}`, role: 'row' },
          weekCells.map((cell) => {
            const disabled = isDateDisabled(cell, minDate, maxDate)
            const isCursor = isSameDate(cell, cursor)
            return h('div', {
              key: formatISODate(cell),
              ref: (el: HTMLElement | null) => {
                if (isCursor) focusTargetRef.current = el
              },
              role: 'gridcell',
              tabIndex: isCursor ? 0 : -1,
              'aria-selected': selectedDate ? isSameDate(cell, selectedDate) : undefined,
              'aria-disabled': disabled || undefined,
              'aria-current': isSameDate(cell, today) ? 'date' : undefined,
              'data-outside-month': !cell.inCurrentMonth || undefined,
              'data-date': formatISODate(cell),
              'data-space-ui': 'date-picker-day',
              onClick: () => commitDay(cell),
            }, String(cell.day))
          }),
        ),
      )
    }

    const daysGrid = h(
      'div',
      {
        key: 'grid',
        role: 'grid',
        'aria-label': `${monthNames[cursor.month - 1]} ${cursor.year}`,
        'data-space-ui': 'date-picker-grid',
        onKeyDown: handleDaysGridKeyDown,
      },
      [weekdayHeaderRow, ...dayRows],
    )

    const renderSpinbutton = (
      spinLabel: string,
      spinValue: number,
      spinMin: number,
      spinMax: number,
      onChange: (next: number) => void,
    ) =>
      h('div', {
        key: spinLabel,
        role: 'spinbutton',
        tabIndex: timeDisabled ? -1 : 0,
        'aria-label': spinLabel,
        'aria-valuemin': spinMin,
        'aria-valuemax': spinMax,
        'aria-valuenow': spinValue,
        'aria-valuetext': String(spinValue).padStart(2, '0'),
        'aria-disabled': timeDisabled || undefined,
        'data-space-ui': 'date-picker-spinbutton',
        onKeyDown: timeDisabled ? undefined : (event: DatePickerKeyEvent) => {
          let next: number | null = null
          if (event.key === 'ArrowUp') next = wrapValue(spinValue, 1, spinMin, spinMax)
          else if (event.key === 'ArrowDown') next = wrapValue(spinValue, -1, spinMin, spinMax)
          else if (event.key === 'Home') next = spinMin
          else if (event.key === 'End') next = spinMax
          if (next === null) return
          event.preventDefault()
          onChange(next)
        },
      }, String(spinValue).padStart(2, '0'))

    const timeSection = withTime
      ? h(
        'div',
        { key: 'time', role: 'group', 'aria-label': 'Time' },
        [
          renderSpinbutton('Hour', selectedHour, 0, 23, (next) => commitTime(next, selectedMinute)),
          h('span', { key: 'sep' }, ':'),
          renderSpinbutton(
            'Minute',
            selectedMinute,
            0,
            59,
            (next) => commitTime(selectedHour, next),
          ),
        ],
      )
      : null

    const doneFooter = withTime
      ? h('div', { key: 'footer' }, Button({ onClick: closeAndRefocus, children: 'Done' }))
      : null

    // --- Months view -----------------------------------------------------------------------------

    const monthsHeader = h('span', { key: 'header', [DISPLAY_CONTENTS_WRAPPER_ATTR]: '' }, [
      hAny(
        Fragment,
        { key: 'prev-year' },
        Button({
          label: 'Previous year',
          onClick: () => setInternalCursor(addYears(cursor, -1)),
          children: '‹',
        }),
      ),
      hAny(
        Fragment,
        { key: 'year-name' },
        Button({
          onClick: () => {
            setInternalYearPageStart(getYearPageStart(cursor.year))
            setView('years')
          },
          children: String(cursor.year),
        }),
      ),
      hAny(
        Fragment,
        { key: 'next-year' },
        Button({
          label: 'Next year',
          onClick: () => setInternalCursor(addYears(cursor, 1)),
          children: '›',
        }),
      ),
    ])

    const monthsGrid = h(
      'div',
      {
        key: 'grid',
        role: 'group',
        'aria-label': `Select a month in ${cursor.year}`,
        'data-space-ui': 'date-picker-month-grid',
      },
      monthNames.map((name, index) => {
        const monthNum = index + 1
        const disabled = isMonthDisabled(cursor.year, monthNum, minDate, maxDate)
        const isCurrent = monthNum === cursor.month
        return h('button', {
          key: monthNum,
          type: 'button',
          disabled,
          ref: (el: HTMLElement | null) => {
            if (isCurrent) focusTargetRef.current = el
          },
          'aria-current': isCurrent || undefined,
          'data-space-ui': 'date-picker-month',
          onClick: () => {
            setInternalCursor({
              year: cursor.year,
              month: monthNum,
              day: Math.min(cursor.day, daysInMonth(cursor.year, monthNum)),
            })
            setView('days')
          },
        }, name)
      }),
    )

    // --- Years view ------------------------------------------------------------------------------

    const yearsHeader = h('span', { key: 'header', [DISPLAY_CONTENTS_WRAPPER_ATTR]: '' }, [
      hAny(
        Fragment,
        { key: 'prev-page' },
        Button({
          label: 'Previous years',
          onClick: () => setInternalYearPageStart(yearPageStart - 12),
          children: '‹',
        }),
      ),
      h('span', { key: 'range' }, `${yearPageStart}–${yearPageStart + 11}`),
      hAny(
        Fragment,
        { key: 'next-page' },
        Button({
          label: 'Next years',
          onClick: () => setInternalYearPageStart(yearPageStart + 12),
          children: '›',
        }),
      ),
    ])

    const yearsGrid = h(
      'div',
      {
        key: 'grid',
        role: 'group',
        'aria-label': `Select a year, ${yearPageStart} to ${yearPageStart + 11}`,
        'data-space-ui': 'date-picker-year-grid',
      },
      Array.from({ length: 12 }, (_, index) => {
        const year = yearPageStart + index
        const disabled = isYearDisabled(year, minDate, maxDate)
        const isCurrent = year === cursor.year
        return h('button', {
          key: year,
          type: 'button',
          disabled,
          ref: (el: HTMLElement | null) => {
            if (isCurrent) focusTargetRef.current = el
          },
          'aria-current': isCurrent || undefined,
          'data-space-ui': 'date-picker-year',
          onClick: () => {
            setInternalCursor({
              year,
              month: cursor.month,
              day: Math.min(cursor.day, daysInMonth(year, cursor.month)),
            })
            setView('days')
          },
        }, String(year))
      }),
    )

    const header = view === 'days' ? daysHeader : (view === 'months' ? monthsHeader : yearsHeader)
    const grid = view === 'days' ? daysGrid : (view === 'months' ? monthsGrid : yearsGrid)

    // Static, non-dynamic `position: fixed; top: 0; left: 0; ...` lives in a self-rendered
    // `<style>` element (see `DATE_PICKER_PANEL_POSITION_CSS`'s own doc) — the genuinely dynamic
    // `transform`/`visibility` are applied to a CSSOM rule inside that SAME element instead of an
    // inline `style` attribute; the panel itself carries no `style` prop at all. Unconditional here
    // (unlike `Select`'s own conditional `styleEl`) since this whole branch already only runs while
    // `open` is true — see the early `if (!open) return` above.
    const panelStyleEl = h(
      'style',
      { key: 'panel-style', nonce, ref: styleElRef },
      DATE_PICKER_PANEL_POSITION_CSS,
    )

    const panel = h(
      'div',
      {
        key: 'panel',
        id: panelId,
        ref: panelRef,
        'data-space-ui': 'date-picker-panel',
        'data-date-picker-id': panelId,
        onKeyDown: escapeHandler,
      },
      [header, grid, view === 'days' ? timeSection : null, view === 'days' ? doneFooter : null],
    )

    return h('span', { ref: containerRef, [DISPLAY_CONTENTS_WRAPPER_ATTR]: '' }, [
      trigger,
      wrapperStyleEl,
      panelStyleEl,
      panel,
    ])
  }
}
