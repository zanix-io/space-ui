import { createIntl, createIntlCache } from '@formatjs/intl'
import type { IntlConfig } from '@formatjs/intl'
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser'

/**
 * One catalog: a flat, namespaced-string-key map to either a hand-authored ICU string or a
 * precompiled AST (`@zanix/cli`'s own ICU→AST compiler output, once that exists — see this
 * package's own `README`/CHANGELOG for the full pipeline). A single catalog may freely mix both
 * across different keys — this is what makes migrating one message at a time from source to
 * compiled possible, rather than an all-or-nothing switch for an entire app.
 *
 * `@formatjs/intl`'s own `IntlConfig['messages']` type is narrower than what its runtime actually
 * accepts: it's declared as a union of two HOMOGENEOUS records (`Record<K, string> |
 * Record<K, MessageFormatElement[]>`), but `createIntl()`/`IntlMessageFormat` resolve each key
 * independently at format time — a genuinely mixed record works identically at runtime. The cast
 * in {@linkcode createFormatter} exists only to bridge that gap in the upstream type declaration,
 * not to paper over an actual runtime risk (confirmed against `intl-messageformat`'s own
 * constructor signature, which accepts `string | MessageFormatElement[]` per call).
 *
 * Typically what `@zanix/space`'s own `loadMessages()` returns, cast at the call site —
 * `@zanix/space` keeps its own `Messages` type deliberately opaque (`Record<string, string>`,
 * never inspecting or promising anything about value shape beyond "flat object"), so a catalog
 * that actually contains precompiled AST values needs an explicit cast at this boundary. That's
 * expected, not a workaround: it's the seam between an intentionally opaque core and this
 * package's own typed consumer of it.
 */
export type Messages = Record<string, string | MessageFormatElement[]>

/**
 * The interpolation/plural/select values {@linkcode Formatter.formatMessage} accepts for one
 * message — primitives only. This contract deliberately never supports ICU rich-text tags
 * (`<b>...</b>` resolving to a renderer-specific element) — see `formatMessage`'s own doc for why.
 */
export type FormatMessageValues = Record<
  string,
  string | number | boolean | Date | null | undefined
>

/**
 * The renderer-agnostic surface both the React and Preact bindings expose through context. Unlike
 * a presentational component's `render.ts` (see `components/Button/render.ts`), this needs no
 * `CreateElement<E>` parameterization at all — formatting a message returns a string, never a
 * renderer-specific element, so the exact same {@linkcode Formatter} value is correct in both
 * bindings verbatim.
 */
export interface Formatter {
  /**
   * Resolves and formats one message by id against the catalog this formatter was created with.
   *
   * A missing id is `@formatjs/intl`'s own default behavior: reported via its internal `onError`
   * (logged, never thrown) and the id itself is returned as the visible fallback. There is no
   * separate `defaultMessage` parameter in this contract — `@zanix/space`'s own flat catalog
   * model already treats the id as the only handle a message has (see `loadMessages()`'s own
   * doc), so the id doubling as its own fallback text keeps that one model consistent end to end,
   * rather than introducing a second, `react-intl`-style `{id, defaultMessage}` descriptor shape
   * this contract deliberately doesn't clone.
   */
  formatMessage(id: string, values?: FormatMessageValues): string
}

/**
 * Builds a {@linkcode Formatter} for one `(locale, messages)` pair — the one piece of actual ICU
 * formatting logic in this package, deliberately not reimplemented: wraps `@formatjs/intl`'s own
 * `createIntl()`, the same "imperative API" FormatJS documents for use outside a component tree
 * (Node, Redux stores, testing — see FormatJS's own `Intl` docs). Never imports React or Preact —
 * `IntlProvider`/`useIntl` (`index.ts`/`index.preact.ts`) are the only renderer-bound pieces in
 * this module, and both call this exact function; nothing here is duplicated per renderer.
 *
 * Deliberately minimal, not a `react-intl` clone: no `formatDate`/`formatNumber`/`formatList`, no
 * rich-text tag support, no `defaultMessage`, no `formatData`/`formatContent` (the legacy
 * component's own recursive-object formatter — see `@zanix/space`'s CHANGELOG for why that stays
 * unported). Only what `formatMessage(id, values)` needs, because that is the entire contract this
 * package's own use case requires.
 *
 * @example
 * ```ts
 * // Outside any component tree — e.g. formatting a message for a non-JSX consumer.
 * const { formatMessage } = createFormatter('en', { 'home/title': 'Welcome' })
 * formatMessage('home/title') // 'Welcome'
 * ```
 */
export function createFormatter(locale: string, messages: Messages): Formatter {
  const cache = createIntlCache()
  // See `Messages`'s own doc for why this cast is safe.
  const intl = createIntl({ locale, messages: messages as IntlConfig['messages'] }, cache)

  return {
    formatMessage(id, values) {
      return intl.formatMessage({ id, defaultMessage: id }, values)
    },
  }
}
