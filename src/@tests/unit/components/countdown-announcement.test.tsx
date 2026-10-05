import { installIntervalClock } from './countdown-test-utils.ts'
import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { Countdown } from 'components/Countdown/index.ts'
import type { CountdownProps } from 'components/Countdown/index.ts'

// Announcement texts: getAnnouncement > the announcement* string props > English.

function announced(
  props: Partial<CountdownProps>,
  msLeft: number,
  advanceMs = 0,
): string {
  const rest = props
  const clock = installIntervalClock()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const countdown = <Countdown target={Date.now() + msLeft} {...rest} />
  act(() =>
    root.render(
      countdown,
    )
  )
  if (advanceMs) act(() => clock.advance(advanceMs))
  const text = must(container.querySelector('[aria-live]')).textContent ?? ''
  act(() => root.unmount())
  clock.restore()
  return text
}

Deno.test('Countdown announcement: without props the English texts are announced', () => {
  assertEquals(announced({}, 125_000), '3 minutes remaining')
  assertEquals(announced({}, 30_000), 'Less than a minute remaining')
  assertEquals(announced({}, 1000, 1000), "Time's up")
})

Deno.test('Countdown announcement: string props win, {minutes} is filled in', () => {
  const props = {
    announcementMinutes: 'Faltan {minutes} min',
    announcementLessThanMinute: 'Menos de un minuto',
    announcementDone: 'Listo',
  }
  assertEquals(announced(props, 125_000), 'Faltan 3 min')
  assertEquals(announced(props, 30_000), 'Menos de un minuto')
  assertEquals(announced(props, 1000, 1000), 'Listo')
})

Deno.test('Countdown announcement: a prop not given keeps its English text', () => {
  assertEquals(announced({ announcementDone: 'Listo' }, 125_000), '3 minutes remaining')
})

Deno.test('Countdown announcement: getAnnouncement wins over the string props', () => {
  assertEquals(
    announced(
      { getAnnouncement: () => 'custom', announcementMinutes: 'x', announcementDone: 'y' },
      125_000,
    ),
    'custom',
  )
})
