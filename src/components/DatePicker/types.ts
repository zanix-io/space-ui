import type { Placement } from 'shared/positioning.ts'
import type { IconProps } from '../Icon/types.ts'

/** Props for {@linkcode DatePicker}. */
export type DatePickerBaseProps = {
  /**
   * ISO 8601, controlled — `'YYYY-MM-DD'` when `withTime` is `false` (the default), `'YYYY-MM-
   * DDTHH:mm'` (24-hour, minute precision, no seconds) when `withTime` is `true`. `null` means no
   * selection. Always wins over `defaultValue` when both are given, ignored not invalid (a
   * malformed string is treated the same as `null`), same contract established throughout this
   * component family.
   */
  value?: string | null
  /** @default null */
  defaultValue?: string | null
  /** Fires whenever a real selection is made (a day, or — with `withTime` — an hour/minute
   * adjustment) — fires even in the uncontrolled case. Never fires for a day outside `[min, max]`. */
  onValueChange?: (value: string | null) => void
  /** Earliest selectable date, ISO `'YYYY-MM-DD'` — no default (nothing is disabled on this side
   * unless given). Compares only the DATE part, even when `withTime` is `true` — this component has
   * no time-of-day range concept. */
  min?: string
  /** Latest selectable date, ISO `'YYYY-MM-DD'` — same contract as {@linkcode min}. */
  max?: string
  /** Controlled popup-open state — same contract as every other overlay in this package. */
  open?: boolean
  /** @default false */
  defaultOpen?: boolean
  /** Fires whenever the trigger, a day/Escape/outside click, or (with `withTime`) the "Done" button
   * would open or close the popup — fires even in the uncontrolled case. */
  onOpenChange?: (open: boolean) => void
  /** @default 'bottom' — same default `Combobox`/`Select`/`Popover` already use. */
  placement?: Placement
  /** @default 8 */
  offset?: number
  /** Shown on the trigger when nothing is selected. With neither `placeholder` nor `label` given
   * and nothing selected, the trigger has no visible text and no accessible name of its own — same
   * disclosed gap `Select.placeholder`'s own doc already documents, the caller is expected to
   * avoid it, not a runtime check this component performs itself. */
  placeholder?: string
  /** Accessible-name override for the trigger button — same "supplements or replaces" contract as
   * `Select.label`/`Button.label`, since the trigger composes a real `Button` and inherits that
   * exact convention. */
  label?: string
  /** An optional icon shown on the trigger, alongside its text — the real `IconProps` `Icon`
   * itself takes, passed straight through unmodified (same "composed, not reimplemented" contract
   * `ImgButton.icon` already establishes). Typically decorative (omit `icon.label` and it renders
   * `aria-hidden`, the same as any other `Icon` usage) — the trigger's own `label` prop above is
   * never forwarded into it. */
  icon?: IconProps
  /**
   * Opts into an additional hour/minute selector alongside the day grid — see this component's own
   * `index.ts` doc, "Time-of-day selection (`withTime`)", for the full contract (the ISO datetime
   * shape, the spinbutton pattern, why picking a day no longer auto-closes the popup, the "Done"
   * button). Purely additive over the date-only mode — a date-of-birth field with no time need
   * simply never sets this. @default false
   */
  withTime?: boolean
  /** 24-hour (`'h24'`) or 12-hour with AM/PM (`'h12'`) display for the time section and the
   * trigger's own formatted value, when `withTime` is `true`. No locale-derived default — see
   * `index.ts`'s own doc for why. @default 'h24' */
  hourCycle?: 'h12' | 'h24'
  /** BCP-47 locale used to format the trigger's own displayed value and the weekday/month names in
   * the popup (`Intl.DateTimeFormat` directly — see `index.ts`'s own doc for why this is a plain
   * prop rather than reading `useIntl()`'s own formatter). @default 'en' */
  locale?: string
  id?: string
  className?: string
}
