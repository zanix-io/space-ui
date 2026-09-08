import { assertEquals } from '@std/assert'
import {
  addDays,
  addMonths,
  addYears,
  compareDates,
  daysInMonth,
  formatDisplayValue,
  formatISODate,
  formatISODateTime,
  getCalendarGrid,
  getMonthNames,
  getWeekdayNames,
  getYearPageStart,
  isDateDisabled,
  isMonthDisabled,
  isSameDate,
  isYearDisabled,
  parseISODate,
  parseISODateTime,
  wrapValue,
} from 'components/DatePicker/date-utils.ts'

// --- parsing / formatting ------------------------------------------------------------------

Deno.test('parseISODate: a well-formed date parses', () => {
  assertEquals(parseISODate('2000-01-31'), { year: 2000, month: 1, day: 31 })
})

Deno.test('parseISODate: null/undefined/empty all parse to null', () => {
  assertEquals(parseISODate(null), null)
  assertEquals(parseISODate(undefined), null)
  assertEquals(parseISODate(''), null)
})

Deno.test('parseISODate: malformed strings parse to null, never a Date-style roll-over', () => {
  assertEquals(parseISODate('not-a-date'), null)
  assertEquals(parseISODate('2000-1-1'), null)
  assertEquals(parseISODate('2000-13-01'), null)
})

Deno.test('parseISODate: a calendar-invalid date (Feb 30) parses to null, never rolls into March', () => {
  assertEquals(parseISODate('2023-02-30'), null)
})

Deno.test('parseISODate: Feb 29 is valid on a leap year, invalid otherwise', () => {
  assertEquals(parseISODate('2024-02-29'), { year: 2024, month: 2, day: 29 })
  assertEquals(parseISODate('2023-02-29'), null)
})

Deno.test('formatISODate: pads month/day to 2 digits', () => {
  assertEquals(formatISODate({ year: 2000, month: 1, day: 5 }), '2000-01-05')
})

Deno.test('parseISODateTime / formatISODateTime round-trip minute precision', () => {
  const parsed = parseISODateTime('2000-01-31T09:05')
  assertEquals(parsed, { date: { year: 2000, month: 1, day: 31 }, hour: 9, minute: 5 })
  if (!parsed) throw new Error('expected a parsed value')
  assertEquals(formatISODateTime(parsed.date, parsed.hour, parsed.minute), '2000-01-31T09:05')
})

Deno.test('parseISODateTime: seconds, if present, are accepted and ignored', () => {
  assertEquals(
    parseISODateTime('2000-01-31T09:05:30'),
    { date: { year: 2000, month: 1, day: 31 }, hour: 9, minute: 5 },
  )
})

Deno.test('parseISODateTime: an out-of-range hour/minute parses to null', () => {
  assertEquals(parseISODateTime('2000-01-31T24:00'), null)
  assertEquals(parseISODateTime('2000-01-31T00:60'), null)
})

Deno.test('parseISODateTime: an invalid date part parses to null', () => {
  assertEquals(parseISODateTime('2023-02-30T09:00'), null)
})

// --- day/month/year arithmetic -------------------------------------------------------------

Deno.test('daysInMonth: real month lengths, leap year included', () => {
  assertEquals(daysInMonth(2023, 2), 28)
  assertEquals(daysInMonth(2024, 2), 29)
  assertEquals(daysInMonth(2023, 4), 30)
  assertEquals(daysInMonth(2023, 1), 31)
})

Deno.test('addDays: crosses a month boundary', () => {
  assertEquals(addDays({ year: 2023, month: 1, day: 31 }, 1), { year: 2023, month: 2, day: 1 })
})

Deno.test('addDays: crosses a year boundary, forward and backward', () => {
  assertEquals(addDays({ year: 2023, month: 12, day: 31 }, 1), { year: 2024, month: 1, day: 1 })
  assertEquals(addDays({ year: 2024, month: 1, day: 1 }, -1), { year: 2023, month: 12, day: 31 })
})

Deno.test('addMonths: clamps the day to the destination month length, never rolls over', () => {
  assertEquals(addMonths({ year: 2024, month: 1, day: 31 }, 1), { year: 2024, month: 2, day: 29 })
  assertEquals(addMonths({ year: 2023, month: 1, day: 31 }, 1), { year: 2023, month: 2, day: 28 })
})

Deno.test('addMonths: crosses a year boundary, forward and backward', () => {
  assertEquals(addMonths({ year: 2023, month: 12, day: 15 }, 1), { year: 2024, month: 1, day: 15 })
  assertEquals(addMonths({ year: 2024, month: 1, day: 15 }, -1), { year: 2023, month: 12, day: 15 })
})

Deno.test('addYears: a leap-day Feb 29 clamps to Feb 28 in a non-leap year', () => {
  assertEquals(addYears({ year: 2024, month: 2, day: 29 }, 1), { year: 2025, month: 2, day: 28 })
})

Deno.test('compareDates: ordering across year/month/day', () => {
  assertEquals(
    compareDates({ year: 2023, month: 1, day: 1 }, { year: 2024, month: 1, day: 1 }) < 0,
    true,
  )
  assertEquals(
    compareDates({ year: 2023, month: 2, day: 1 }, { year: 2023, month: 1, day: 1 }) > 0,
    true,
  )
  assertEquals(compareDates({ year: 2023, month: 1, day: 1 }, { year: 2023, month: 1, day: 1 }), 0)
})

Deno.test('isSameDate: null on either side is never equal to anything', () => {
  const d = { year: 2023, month: 1, day: 1 }
  assertEquals(isSameDate(d, d), true)
  assertEquals(isSameDate(null, d), false)
  assertEquals(isSameDate(d, null), false)
  assertEquals(isSameDate(null, null), false)
})

// --- min/max disabling ----------------------------------------------------------------------

Deno.test('isDateDisabled: no min/max — nothing is disabled', () => {
  assertEquals(isDateDisabled({ year: 2023, month: 1, day: 1 }), false)
})

Deno.test('isDateDisabled: before min, or after max', () => {
  const min = { year: 2023, month: 1, day: 10 }
  const max = { year: 2023, month: 1, day: 20 }
  assertEquals(isDateDisabled({ year: 2023, month: 1, day: 9 }, min, max), true)
  assertEquals(isDateDisabled({ year: 2023, month: 1, day: 10 }, min, max), false)
  assertEquals(isDateDisabled({ year: 2023, month: 1, day: 20 }, min, max), false)
  assertEquals(isDateDisabled({ year: 2023, month: 1, day: 21 }, min, max), true)
})

Deno.test('isMonthDisabled: a month with at least one in-range day stays enabled', () => {
  const min = { year: 2023, month: 1, day: 31 }
  // January still has ONE in-range day (the 31st) — not fully disabled.
  assertEquals(isMonthDisabled(2023, 1, min), false)
  // December has none.
  assertEquals(isMonthDisabled(2022, 12, min), true)
})

Deno.test('isYearDisabled: a year with at least one in-range day stays enabled', () => {
  const min = { year: 2023, month: 12, day: 31 }
  assertEquals(isYearDisabled(2023, min), false)
  assertEquals(isYearDisabled(2022, min), true)
})

// --- calendar grid ---------------------------------------------------------------------------

Deno.test('getCalendarGrid: always 42 cells', () => {
  assertEquals(getCalendarGrid(2024, 2).length, 42)
})

Deno.test('getCalendarGrid: leading/trailing cells from adjacent months are marked, current-month days are not', () => {
  // January 2023: the 1st is a Sunday, so with weekStartsOn=0 there are no leading days at all.
  const grid = getCalendarGrid(2023, 1)
  assertEquals(grid[0], { year: 2023, month: 1, day: 1, inCurrentMonth: true })
  const lastDay = grid.find((cell) => cell.year === 2023 && cell.month === 1 && cell.day === 31)
  assertEquals(lastDay?.inCurrentMonth, true)
  const trailing = grid[grid.length - 1]
  assertEquals(trailing.inCurrentMonth, false)
})

Deno.test('getCalendarGrid: weekStartsOn shifts the leading days', () => {
  // February 2024 starts on a Thursday. weekStartsOn=1 (Monday) needs 3 leading days.
  const grid = getCalendarGrid(2024, 2, 1)
  assertEquals(grid[0], { year: 2024, month: 1, day: 29, inCurrentMonth: false })
  assertEquals(grid[3], { year: 2024, month: 2, day: 1, inCurrentMonth: true })
})

// --- year pagination -------------------------------------------------------------------------

Deno.test('getYearPageStart: fixed 12-year page boundaries', () => {
  assertEquals(getYearPageStart(2021), 2016)
  assertEquals(getYearPageStart(2016), 2016)
  assertEquals(getYearPageStart(2027), 2016)
  assertEquals(getYearPageStart(2028), 2028)
})

// --- locale-aware names ----------------------------------------------------------------------

Deno.test('getWeekdayNames: 7 names, Sunday-first by default', () => {
  const names = getWeekdayNames('en')
  assertEquals(names.length, 7)
  assertEquals(names[0], 'Sun')
})

Deno.test('getWeekdayNames: weekStartsOn shifts the order', () => {
  const names = getWeekdayNames('en', 1)
  assertEquals(names[0], 'Mon')
})

Deno.test('getMonthNames: 12 names, January-first, locale-aware', () => {
  const en = getMonthNames('en')
  assertEquals(en.length, 12)
  assertEquals(en[0], 'January')
  const es = getMonthNames('es')
  assertEquals(es[0], 'enero')
})

// --- display formatting ----------------------------------------------------------------------

Deno.test('formatDisplayValue: date-only, locale-aware', () => {
  const date = { year: 2000, month: 1, day: 15 }
  assertEquals(formatDisplayValue(date, 'en'), 'January 15, 2000')
})

Deno.test('formatDisplayValue: with time, 24h vs 12h', () => {
  const date = { year: 2000, month: 1, day: 15 }
  const h24 = formatDisplayValue(date, 'en', { hour: 13, minute: 5 }, 'h24')
  const h12 = formatDisplayValue(date, 'en', { hour: 13, minute: 5 }, 'h12')
  assertEquals(h24.includes('13:05'), true)
  assertEquals(h12.toLowerCase().includes('pm'), true)
})

// --- spinbutton wraparound -------------------------------------------------------------------

Deno.test('wrapValue: increments/decrements within range', () => {
  assertEquals(wrapValue(5, 1, 0, 23), 6)
  assertEquals(wrapValue(5, -1, 0, 23), 4)
})

Deno.test('wrapValue: wraps at both boundaries', () => {
  assertEquals(wrapValue(23, 1, 0, 23), 0)
  assertEquals(wrapValue(0, -1, 0, 23), 23)
  assertEquals(wrapValue(59, 1, 0, 59), 0)
})
