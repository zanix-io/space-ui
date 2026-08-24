import { useEffect, useRef } from 'preact/hooks'

/**
 * Preact binding — see `close-on-outside.ts`'s own doc for the full contract. Same behavior,
 * independent implementation, never `preact/compat`.
 */
export function useCloseOnOutside(
  ref: { current: HTMLElement | null },
  active: boolean,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (ref.current && target && !ref.current.contains(target)) onCloseRef.current()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [active, ref])
}
