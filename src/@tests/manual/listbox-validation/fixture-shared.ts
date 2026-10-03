export const MESSAGE = 'Pick one from the list'

export const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
]

export function matchesLabel(options: { label: string }[], text: string): boolean {
  return options.some((option) => option.label === text)
}

/** Records, for the real events a click on a submit button goes through, the order they fire in
 * and the native validity of the combobox input at that moment, on `window.__log`. */
export function installEventLog(): void {
  const log: string[] = []
  ;(globalThis as unknown as { __log: string[] }).__log = log
  const state = (target: EventTarget | null): string => {
    const form = (target as Element | null)?.closest?.('form') ?? null
    const input = form?.querySelector<HTMLInputElement>('input[role="combobox"]')
    return input ? `customError=${input.validity.customError}` : 'no-input'
  }
  for (
    const type of ['mousedown', 'focusout', 'focusin', 'click', 'invalid', 'submit', 'keydown']
  ) {
    document.addEventListener(
      type,
      (event) => {
        const target = event.target as Element | null
        const where = target?.id || target?.tagName.toLowerCase() || '?'
        const key = type === 'keydown' ? ` ${(event as KeyboardEvent).key}` : ''
        log.push(`${type}${key} on ${where}: ${state(target)}`)
      },
      { capture: true },
    )
  }
}
