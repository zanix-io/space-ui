import { createContext, createElement, useContext, useMemo } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { createFormatter } from './formatter.ts'
import type { Formatter, Messages } from './formatter.ts'

export { createFormatter } from './formatter.ts'
export type { FormatMessageValues, Formatter, Messages, RichTextTagFn } from './formatter.ts'

const IntlContext = createContext<Formatter | null>(null)

/** Props {@linkcode IntlProvider} accepts. */
export interface IntlProviderProps {
  /** BCP-47 locale, passed straight through to `@formatjs/intl`'s own `createIntl()` — used for
   * plural-rule/number/date resolution (CLDR data), never for message lookup itself (lookup is a
   * flat id → value catalog, entirely separate from locale). Typically the same `lang` a page's
   * `loader` already has from `langPreHandler`'s own `:lang` route param. */
  locale: string
  /** The catalog to format against — typically `@zanix/space`'s own `loadMessages()` result, cast
   * at the call site if it contains precompiled AST values (see {@linkcode Messages}'s own doc for
   * why that cast is expected). */
  messages: Messages
  /** The subtree that gets `useIntl()` access to the formatter built from `locale`/`messages`. */
  children?: ReactNode
}

/**
 * Provides a {@linkcode Formatter} to `useIntl()` for every descendant. React binding — this
 * package's own `mod.ts` (default entrypoint); import from `@zanix/space-ui/preact` instead for
 * the Preact one, same contract, same rendered behavior. This is a full, independent
 * implementation, not shared logic bound twice — real per-renderer hook usage (`useContext`/
 * `useMemo`) needs that, the same way `@zanix/space` itself splits `render-page-react.tsx`/
 * `render-page-preact.ts` (see this package's own CHANGELOG for why a presentational component
 * like `Button` gets to share `render.ts` instead, and this doesn't).
 *
 * The formatter is only rebuilt when `locale`/`messages` themselves change (`useMemo`) —
 * typically once per request in SSR (a fresh `IntlProvider` per render), so this matters mostly
 * for a long-lived client tree that re-renders often, not for the SSR path itself.
 *
 * @example
 * ```tsx
 * <IntlProvider locale={lang} messages={messages}>
 *   <App />
 * </IntlProvider>
 * ```
 */
export function IntlProvider(props: IntlProviderProps): ReactElement {
  const { locale, messages, children } = props
  const formatter = useMemo(() => createFormatter(locale, messages), [locale, messages])
  return createElement(IntlContext.Provider, { value: formatter }, children)
}

/**
 * Reads the {@linkcode Formatter} provided by the nearest `<IntlProvider>`. Throws if called
 * outside one — fails fast rather than silently formatting against an empty catalog, which would
 * surface as every message rendering as its own raw id with no indication why.
 *
 * @example
 * ```tsx
 * const { formatMessage } = useIntl()
 * return <h1>{formatMessage('home/title')}</h1>
 * ```
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
