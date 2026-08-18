import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from './render.ts'
import type { ButtonProps } from './types.ts'

/**
 * A real `<button>` — for anything that triggers an action, never navigates. `label` is only
 * needed for an icon-only button (see {@linkcode ButtonProps.label}'s own doc); a button with
 * visible text `children` already has an accessible name from that text. `role="switch"`/
 * `"checkbox"`/`"radio"`/`"menuitemcheckbox"`/`"menuitemradio"` require `checked`; `role="tab"`
 * requires `selected` — both enforced at the type level (see {@linkcode ButtonProps}'s own doc).
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Button onClick={() => setOpen(true)}>Open menu</Button>
 * <Button onClick={close} label="Close dialog"><Icon name="close" href="..." viewBox="0 0 24 24" /></Button>
 * <Button role="switch" checked={enabled} onClick={toggle}>Notifications</Button>
 * <Button type="submit" name="action" value="archive">Archive</Button>
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Button: (props: ButtonProps) => ReactElement = createButton(
  createElement as unknown as CreateElement<ReactElement>,
)
