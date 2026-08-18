import { createContext, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useContext, useMemo } from 'preact/hooks'
import { createFormatter } from './formatter.ts'
import type { Formatter, Messages } from './formatter.ts'

export { createFormatter } from './formatter.ts'
export type { FormatMessageValues, Formatter, Messages } from './formatter.ts'

const IntlContext = createContext<Formatter | null>(null)

/** Props {@linkcode IntlProvider} accepts. Same shape as the React binding's own
 * `IntlProviderProps` except for `children`'s type — see `index.ts`'s own doc for the full field
 * descriptions, not repeated here. */
export interface IntlProviderProps {
  locale: string
  messages: Messages
  children?: ComponentChildren
}

/**
 * Provides a {@linkcode Formatter} to `useIntl()` for every descendant. Preact binding — see
 * `index.ts`'s own doc for the full description; import from `@zanix/space-ui` (no subpath) for
 * the React one. Same contract, same rendered behavior, independent implementation — never
 * `preact/compat`.
 */
export function IntlProvider(props: IntlProviderProps): VNode {
  const { locale, messages, children } = props
  const formatter = useMemo(() => createFormatter(locale, messages), [locale, messages])
  // `h()`'s own inferred return type here is `VNode<Attributes & {value, children}>` — narrower
  // than the bare `VNode` this function declares (an explicit return type is required by this
  // package's own public-API lint rule). The cast bridges that gap, same reasoning as
  // `components/Button/index.preact.ts`'s own `h as unknown as CreateElement<VNode>` cast.
  return h(IntlContext.Provider, { value: formatter, children }) as VNode
}

/**
 * Reads the {@linkcode Formatter} provided by the nearest `<IntlProvider>`. Throws if called
 * outside one — same fail-fast contract as the React binding's own `useIntl()`.
 */
export function useIntl(): Formatter {
  const formatter = useContext(IntlContext)
  if (!formatter) {
    throw new Error(
      'useIntl() was called outside an <IntlProvider>. Wrap the component tree that needs it ' +
        'with <IntlProvider locale={...} messages={...}>.',
    )
  }
  return formatter
}
