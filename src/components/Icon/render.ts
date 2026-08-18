import type { CreateElement } from 'typings/renderer.ts'
import type { IconProps } from './types.ts'

/**
 * The real implementation of `Icon`, shared identically between the React and Preact bindings
 * (`index.ts`/`index.preact.ts`) — parametrized by `h`, the renderer's own element-creation
 * function. This file never imports React or Preact itself, and never branches on which one is
 * active — the one thing that differs between renderers is which function gets passed in here,
 * decided once, at the two binding files, never inside this one. Works because
 * `React.createElement` and `Preact.h` share the exact same call signature for a plain host
 * element (see {@linkcode CreateElement}) — this pattern only holds for markup this simple; a
 * component with real per-renderer hook usage needs a full second implementation instead (see
 * `@zanix/space`'s own `render-page-react.tsx`/`render-page-preact.ts` split for that case).
 */
export function createIcon<E>(h: CreateElement<E>): (props: IconProps) => E {
  return function Icon(
    { name, href, viewBox, size = 24, label, className, id }: IconProps,
  ): E {
    const decorative = !label

    return h(
      'svg',
      {
        id,
        width: size,
        height: size,
        viewBox,
        className,
        role: decorative ? undefined : 'img',
        'aria-hidden': decorative ? true : undefined,
        'aria-label': decorative ? undefined : label,
      },
      h('use', { href: `${href}#${name}` }),
    )
  }
}
