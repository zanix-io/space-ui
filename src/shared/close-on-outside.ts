import { useEffect, useRef } from 'react'

/**
 * Closes on the first `mousedown` outside `ref`'s own subtree, while `active`. Deliberately small
 * and self-contained, doing exactly one thing — originally written for `Menu`'s own submenu
 * disclosure, moved here once `Modal` needed the identical "click outside this, close it"
 * behavior for its no-backdrop case: a genuine second consumer, not a speculative shared
 * abstraction built ahead of one.
 *
 * `onClose` is read through a ref updated every render, not a `useEffect` dependency — so passing
 * a fresh inline closure each render (the common case) never tears down and re-subscribes the
 * listener; only `active` toggling does.
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
