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
  /** `'HH:mm'` (24-hour) — the time a freshly picked day starts at while nothing is selected yet,
   * when `withTime` is `true`. Once a value exists, picking another day keeps its time. A malformed
   * string is ignored, same as an unset one. @default '00:00' */
  defaultTime?: string
  /** BCP-47 locale used to format the trigger's own displayed value and the weekday/month names in
   * the popup (`Intl.DateTimeFormat` directly — see `index.ts`'s own doc for why this is a plain
   * prop rather than reading `useIntl()`'s own formatter). @default 'en' */
  locale?: string
  /** Accessible name of the days view's previous-month arrow. Pass it already translated.
   * @default 'Previous month' */
  previousMonthLabel?: string
  /** Accessible name of the days view's next-month arrow. Pass it already translated.
   * @default 'Next month' */
  nextMonthLabel?: string
  /** Accessible name of the months view's previous-year arrow. Pass it already translated.
   * @default 'Previous year' */
  previousYearLabel?: string
  /** Accessible name of the months view's next-year arrow. Pass it already translated.
   * @default 'Next year' */
  nextYearLabel?: string
  /** Accessible name of the years view's previous-page arrow. Pass it already translated.
   * @default 'Previous years' */
  previousYearsLabel?: string
  /** Accessible name of the years view's next-page arrow. Pass it already translated.
   * @default 'Next years' */
  nextYearsLabel?: string
  /** Accessible name of the hour/minute group (`withTime`). Pass it already translated.
   * @default 'Time' */
  timeLabel?: string
  /** Accessible name of the hour spinbutton (`withTime`). Pass it already translated.
   * @default 'Hour' */
  hourLabel?: string
  /** Accessible name of the minute spinbutton (`withTime`). Pass it already translated.
   * @default 'Minute' */
  minuteLabel?: string
  /** Text of the button that closes the popup (`withTime`). Pass it already translated.
   * @default 'Done' */
  doneLabel?: string
  /** Accessible name of the months grid; every `{year}` marker is replaced by the year shown. Pass it already translated.
   * @default 'Select a month in {year}' */
  monthGridLabel?: string
  /** Accessible name of the years grid; `{from}` and `{to}` are the first and last year of the page shown. Pass it already translated.
   * @default 'Select a year, {from} to {to}' */
  yearGridLabel?: string
  /**
   * Marks the control as holding an invalid value, on the trigger `<button>`: the one focusable,
   * named element of the component, which `Field`'s `<label htmlFor>` points at and which a
   * `[aria-invalid="true"]` focus lookup reaches directly. Pass it together with
   * `aria-describedby`, and give the visible text to `Field`'s `error`, whose render-prop already
   * hands both over:
   *
   * ```tsx
   * <Field label='Birthday' error={error}>
   *   {(field) => <DatePicker {...field} placeholder='Pick a date' />}
   * </Field>
   * ```
   *
   * The trigger is a `role="combobox"` button with `aria-haspopup="dialog"`, a role WAI-ARIA 1.2
   * lists `aria-invalid` for, the same as `SelectBaseProps['aria-invalid']` documents. It decides
   * nothing about what is valid (a date outside `min`/`max` is still the caller's to report), and
   * there is no `validationMessage`: a `type="button"` button is excluded from the browser's
   * constraint validation. Absent by default: nothing is rendered.
   */
  /**
   * Marks the control as required. This component renders no native field, so the browser's own
   * `required` cannot apply to it: while `required` is set and no date is chosen, its own element carries
   * `data-value-missing="true"` (the DOM counterpart of `validity.valueMissing`), which a
   * form-level validator such as `@zanix/space`'s `ManagedForm` `validateInline` reads to block the
   * submit and show the field's own message. Nothing else changes, and the attribute blocks nothing
   * without such a validator: the server still decides. Absent by default.
   */
  required?: boolean
  'aria-invalid'?: boolean
  /**
   * The id(s) of the element(s) that describe the control (an error, a hint), on the trigger
   * `<button>`, where `aria-describedby` is valid. `Field`'s render-prop gives it already combined
   * (the hint's and the error's ids, space-separated), so pass it verbatim. Absent by default.
   */
  'aria-describedby'?: string
  id?: string
  className?: string
  /** Threaded onto this component's own self-rendered `<style>` element(s), required only when
   * the consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own zero-config
   * default is exactly this shape) — without a matching nonce, a strict CSP blocks this
   * component's ENTIRE panel positioning (`position: fixed` and the dynamic
   * `transform`/`visibility` `usePosition` computes) the same way it would an inline `style`
   * attribute, same contract `SelectBaseProps.nonce` already establishes (see `render.ts`'s own
   * doc, and `shared/overlay-position-css.ts`'s, for the full mechanism). Omit `nonce` entirely
   * when no such CSP is in effect — nothing here changes. */
  nonce?: string
}
