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
 * (`<b>...</b>` resolving to a renderer-specific element) directly — {@linkcode Formatter.formatRichText}
 * is the dedicated, separate contract for that instead, so this one stays exactly what its name says.
 */
export type FormatMessageValues = Record<
  string,
  string | number | boolean | Date | null | undefined
>

/**
 * A handler for one ICU rich-text tag (`<b>...</b>`) — called with that tag's own parsed children
 * (a mix of literal string runs and, for a nested tag, whatever `T` that nested tag's own handler
 * already returned), returning the renderer-specific node for it. Structurally identical to
 * `intl-messageformat`'s own `FormatXMLElementFn<T>` — redeclared locally rather than imported so
 * this module doesn't need a direct dependency on that package for one type alias (already pulled
 * in transitively via `@formatjs/intl`; `intl-messageformat`'s own runtime is never imported here,
 * only this shape).
 */
export type RichTextTagFn<T> = (chunks: Array<string | T>) => T

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

  /**
   * Like {@linkcode formatMessage}, but recognizes ICU rich-text tags (`<b>...</b>`) in the
   * message and, for each tag name present in `tags`, calls the matching {@linkcode RichTextTagFn}
   * with that tag's own parsed children — `@formatjs/intl`'s own native rich-text mechanism:
   * `IntlShape.formatMessage` already has a generic overload accepting
   * `Record<string, PrimitiveType | FormatXMLElementFn<T>>`
   * and returning `string | T | Array<string | T>`), exposed here as its own contract rather than
   * folded into `formatMessage` itself — `RichText` is this method's first real consumer, the same
   * "build it once a real consumer needs it" reasoning `usePosition` was deferred under until
   * `Popover` arrived.
   *
   * `tags` and `values` are merged into ONE record before the real call (`{...values, ...tags}` —
   * a tag always wins on a same-named collision), exactly the single combined record
   * `IntlShape.formatMessage` itself expects; splitting them into two parameters here is a pure
   * call-site convenience (a large, mostly-static tag table vs. small, per-call interpolation
   * values), not a different semantics from the one underlying call.
   *
   * Return shape: a message with no tags in it at all returns a plain `string`, identically to
   * `formatMessage` —
   * this holds even when `tags` itself is non-empty but the message just doesn't use any of them.
   * A message that's ENTIRELY one single tag returns that tag's own `T` directly. Anything mixing
   * literal text with one or more tags returns `Array<string | T>`, in document order — this is
   * `@formatjs/intl`'s own real return type, not narrowed or altered here.
   */
  formatRichText<T>(
    id: string,
    tags: Record<string, RichTextTagFn<T>>,
    values?: FormatMessageValues,
  ): string | T | Array<string | T>
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
 * `defaultMessage`, no `formatData`/`formatContent` (the legacy component's own recursive-object
 * formatter — see `@zanix/space`'s CHANGELOG for why that stays unported). Rich-text tag support
 * (`formatRichText`) WAS deliberately deferred here too, until `RichText` became its first real
 * consumer — see that method's own doc.
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
  // `createIntl<unknown>`, not the bare `createIntl(...)` default: `IntlShape<T = string>`'s own
  // default type parameter constrains `formatMessage`'s generic rich-text overload to
  // `T extends string`, which would reject a real renderer-specific `T` (`ReactNode`, Preact's own
  // node type) outright at the type level. Widening to `<unknown>` here doesn't alter the plain
  // `formatMessage` path's own behavior at all — the same one `intl` instance serves both.
  // See `Messages`'s own doc for why the `messages` cast below is safe.
  const intl = createIntl<unknown>({ locale, messages: messages as IntlConfig['messages'] }, cache)

  return {
    formatMessage(id, values) {
      return intl.formatMessage({ id, defaultMessage: id }, values)
    },
    formatRichText<T>(
      id: string,
      tags: Record<string, RichTextTagFn<T>>,
      values?: FormatMessageValues,
    ) {
      // No explicit type argument on the real call below — `IntlShape.formatMessage`'s own generic
      // overload takes exactly 0 or 2 type parameters (`T` AND `TValue` together), never 1; letting
      // both infer from `{...values, ...tags}`'s own shape avoids needing to name `TValue`
      // (`RichTextTagFn<T>`'s own real upstream counterpart) at all.
      return intl.formatMessage({ id, defaultMessage: id }, { ...values, ...tags }) as
        | string
        | T
        | Array<string | T>
    },
  }
}
