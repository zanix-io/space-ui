/**
 * Pure calendar arithmetic and ISO 8601 parsing/formatting for `DatePicker` — the same "extract the
 * arithmetic, test it exhaustively" discipline `Pagination/get-pagination-items.ts` and
 * `Table/get-next-table-sort.ts` already establish for this package: no DOM, no renderer, no hooks,
 * directly unit-testable on its own.
 *
 * Every function here works in UTC internally (`Date.UTC`/`getUTC*`), regardless of the host
 * runtime's own local timezone — a calendar date (`'2000-01-01'`) is a plain, timezone-less label,
 * never an instant, and computing it via a LOCAL `Date` would silently shift the day near midnight
 * for a browser/server running in a negative-UTC-offset zone. `getTodayLocal` is the one deliberate
 * exception (see its own doc).
 */

/** A plain calendar date — `month` is 1-12 (never the 0-based `Date.getMonth()` convention), always
 * a real, valid date for its own `year`/`month` (never e.g. `{ month: 2, day: 30 }`) once produced
 * by any function in this module. */
export type CalendarDate = { year: number; month: number; day: number }

/** One calendar-grid cell — a {@linkcode CalendarDate} plus whether it belongs to the month the
 * grid was built for (a leading/trailing cell from the adjacent month is still a real, selectable
 * date, just visually de-emphasized by the caller via `inCurrentMonth`). */
export type CalendarCell = CalendarDate & { inCurrentMonth: boolean }

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const ISO_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0')
}

/** The real number of days in `year`/`month` (1-12) — leap years included, via a real `Date.UTC`
 * roll-over (`day 0` of the FOLLOWING month is the last day of THIS one). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  return Number.isInteger(year) && month >= 1 && month <= 12 && day >= 1 &&
    day <= daysInMonth(year, month)
}

/** Parses a strict `'YYYY-MM-DD'` string — `null` for `null`/`undefined`/an empty string/anything
 * malformed OR calendar-invalid (`'2023-02-30'`), never a `Date`-object-style silent roll-over
 * (`new Date('2023-02-30')` rolling into March, the well-known ambiguity this component's own
 * "a picker, not a typed date entry" design exists to sidestep at the INPUT layer too). */
export function parseISODate(value: string | null | undefined): CalendarDate | null {
  if (!value) return null
  const match = ISO_DATE_RE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidCalendarDate(year, month, day)) return null
  return { year, month, day }
}

/** Formats a {@linkcode CalendarDate} as `'YYYY-MM-DD'` — the inverse of {@linkcode parseISODate}. */
export function formatISODate(date: CalendarDate): string {
  return `${pad(date.year, 4)}-${pad(date.month)}-${pad(date.day)}`
}

/** A parsed `withTime` value — the {@linkcode CalendarDate} plus a 24-hour `hour`
 * (0-23)/`minute` (0-59). */
export type CalendarDateTime = { date: CalendarDate; hour: number; minute: number }

/** Parses `'YYYY-MM-DDTHH:mm'` (seconds, if present, are accepted and ignored — this component
 * never selects seconds) — `null` for anything malformed or calendar-invalid, same contract as
 * {@linkcode parseISODate}. */
export function parseISODateTime(value: string | null | undefined): CalendarDateTime | null {
  if (!value) return null
  const match = ISO_DATETIME_RE.exec(value)
  if (!match) return null
  const date = parseISODate(`${match[1]}-${match[2]}-${match[3]}`)
  if (!date) return null
  const hour = Number(match[4])
  const minute = Number(match[5])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { date, hour, minute }
}

/** Formats a {@linkcode CalendarDate} plus `hour`/`minute` as `'YYYY-MM-DDTHH:mm'` — the inverse of
 * {@linkcode parseISODateTime}. Always minute precision, never seconds — this component has no UI
 * for selecting seconds, so emitting a trailing `:00` would be a precision this component never
 * actually lets the caller distinguish. */
export function formatISODateTime(date: CalendarDate, hour: number, minute: number): string {
  return `${formatISODate(date)}T${pad(hour)}:${pad(minute)}`
}

/** Adds (or, for a negative `delta`, subtracts) whole calendar days — real month/year roll-over via
 * `Date.UTC` millisecond arithmetic, never a naive `day + delta` field mutation. */
export function addDays(date: CalendarDate, delta: number): CalendarDate {
  const ts = Date.UTC(date.year, date.month - 1, date.day) + delta * 86_400_000
  const rolled = new Date(ts)
  return {
    year: rolled.getUTCFullYear(),
    month: rolled.getUTCMonth() + 1,
    day: rolled.getUTCDate(),
  }
}

/** Adds (or subtracts) whole calendar months. Clamps `day` to the destination month's own real
 * length rather than rolling over (`addMonths({ year: 2024, month: 1, day: 31 }, 1)` →
 * `2024-02-29`, never `2024-03-02`) — the same "clamp, don't roll" convention a real calendar UI
 * needs; a naive `Date.UTC` add would silently roll into the wrong month for exactly this case. */
export function addMonths(date: CalendarDate, delta: number): CalendarDate {
  const totalMonths = date.year * 12 + (date.month - 1) + delta
  const year = Math.floor(totalMonths / 12)
  const month = totalMonths - year * 12 + 1
  const day = Math.min(date.day, daysInMonth(year, month))
  return { year, month, day }
}

/** Adds (or subtracts) whole calendar years — `addMonths(date, delta * 12)`, same day-clamping
 * (a leap-day `Feb 29` moving to a non-leap year clamps to `Feb 28`). */
export function addYears(date: CalendarDate, delta: number): CalendarDate {
  return addMonths(date, delta * 12)
}

/** `-1`/`0`/`1`, the same contract `Array.prototype.sort` expects — never a magic boolean. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

export function isSameDate(a: CalendarDate | null, b: CalendarDate | null): boolean {
  if (!a || !b) return false
  return compareDates(a, b) === 0
}

/** Whether `date` falls outside the closed `[min, max]` range — either bound may be omitted
 * (`null`/`undefined`), same "no default `min`" contract the requirement doc's own `min`/`max`
 * props document. */
export function isDateDisabled(
  date: CalendarDate,
  min?: CalendarDate | null,
  max?: CalendarDate | null,
): boolean {
  if (min && compareDates(date, min) < 0) return true
  if (max && compareDates(date, max) > 0) return true
  return false
}

/** Whether EVERY day in `year`/`month` falls outside `[min, max]` — used to disable an entire
 * month button in the month-selection view (a month with at least one in-range day stays enabled,
 * even if some of its days individually are not). */
export function isMonthDisabled(
  year: number,
  month: number,
  min?: CalendarDate | null,
  max?: CalendarDate | null,
): boolean {
  const first = { year, month, day: 1 }
  const last = { year, month, day: daysInMonth(year, month) }
  if (max && compareDates(first, max) > 0) return true
  if (min && compareDates(last, min) < 0) return true
  return false
}

/** Whether EVERY day in `year` falls outside `[min, max]` — same reasoning as
 * {@linkcode isMonthDisabled}, one level up. */
export function isYearDisabled(
  year: number,
  min?: CalendarDate | null,
  max?: CalendarDate | null,
): boolean {
  const first = { year, month: 1, day: 1 }
  const last = { year, month: 12, day: 31 }
  if (max && compareDates(first, max) > 0) return true
  if (min && compareDates(last, min) < 0) return true
  return false
}

/**
 * Builds a fixed 42-cell (6-week) calendar grid for `year`/`month`, starting from the most recent
 * `weekStartsOn` weekday on or before the 1st — always 42 cells regardless of the month's own real
 * length, the standard fixed-height calendar-grid convention (avoids the grid's own height jumping
 * between 4/5/6 rows as the caller pages between months).
 *
 * @param weekStartsOn 0 (Sunday) by default; `Intl.Locale.prototype.getWeekInfo` would give a real
 * per-locale default but isn't yet supported broadly enough at the time of writing to trust as the
 * sole source — the caller may pass a locale-appropriate value explicitly instead.
 */
export function getCalendarGrid(year: number, month: number, weekStartsOn = 0): CalendarCell[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const leadingDays = (firstWeekday - weekStartsOn + 7) % 7
  const start = addDays({ year, month, day: 1 }, -leadingDays)
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const cell = addDays(start, i)
    cells.push({ ...cell, inCurrentMonth: cell.year === year && cell.month === month })
  }
  return cells
}

/** The first year of the fixed 12-year page `year` falls on (`2021` → `2016`, for the default
 * `pageSize` of 12) — pages are fixed, absolute boundaries (`year - (year % pageSize)`, adjusted for
 * negative years), not a sliding window centered on `year`, so paging forward/back from any given
 * page always lands on the same fixed boundaries a second visit would. */
export function getYearPageStart(year: number, pageSize = 12): number {
  return year - (((year % pageSize) + pageSize) % pageSize)
}

/** Locale-aware weekday abbreviations, `weekStartsOn`-first — anchored on 2023-01-01 (a real,
 * known Sunday in UTC), never the runtime's own current date, so this is deterministic regardless
 * of when it's called. */
export function getWeekdayNames(locale: string, weekStartsOn = 0): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const names: string[] = []
  for (let i = 0; i < 7; i++) {
    const offset = (weekStartsOn + i) % 7
    names.push(formatter.format(new Date(Date.UTC(2023, 0, 1 + offset))))
  }
  return names
}

/** Locale-aware full month names, January-first, regardless of `weekStartsOn`-style locale
 * conventions (months have no analogous "start" concept). */
export function getMonthNames(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })
  const names: string[] = []
  for (let month = 0; month < 12; month++) {
    names.push(formatter.format(new Date(Date.UTC(2023, month, 1))))
  }
  return names
}

/**
 * Formats `date` (plus `time`, when given) for the trigger's own visible text — always
 * `timeZone: 'UTC'`, matching every other function in this module: a calendar date/wall-clock time
 * is a label, not an instant, so formatting it against the HOST's own local timezone would risk
 * displaying a different day/hour than what was actually selected.
 */
export function formatDisplayValue(
  date: CalendarDate,
  locale: string,
  time?: { hour: number; minute: number } | null,
  hourCycle: 'h12' | 'h24' = 'h24',
): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }
  if (time) {
    options.hour = '2-digit'
    options.minute = '2-digit'
    options.hourCycle = hourCycle === 'h12' ? 'h12' : 'h23'
  }
  const jsDate = new Date(
    Date.UTC(date.year, date.month - 1, date.day, time?.hour ?? 0, time?.minute ?? 0),
  )
  return new Intl.DateTimeFormat(locale, options).format(jsDate)
}

/** Increments/decrements `value` by `delta`, wrapping around `[min, max]` (inclusive) rather than
 * clamping — an hour/minute spinbutton's own expected behavior (`23 + 1 → 0`, `0 - 1 → 23`), unlike
 * {@linkcode addMonths}/{@linkcode addYears}'s deliberate day-CLAMPING (a calendar has a genuine
 * "shorter month" edge case; a clock face has no equivalent, it only ever wraps). */
export function wrapValue(value: number, delta: number, min: number, max: number): number {
  const range = max - min + 1
  return min + (((value - min + delta) % range) + range) % range
}

/** The caller's own LOCAL today, as a {@linkcode CalendarDate} — the one deliberate exception to
 * this module's own UTC-everywhere rule, since "today" is inherently local-timezone-relative (a
 * user picking their own date of birth thinks in their own wall-clock day, not UTC's). Never called
 * during a component's initial render (see `DatePicker/render.ts`'s own `today` state doc) — this
 * is what keeps SSR/first-client-paint deterministic despite this function's own real
 * non-determinism (seam 6: "the first render is deterministic, always"). */
export function getTodayLocal(): CalendarDate {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}
