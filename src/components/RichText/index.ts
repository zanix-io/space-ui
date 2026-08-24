import { createElement, Fragment, useMemo } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useIntl } from 'intl/index.ts'
import type { RichTextTagFn } from 'intl/formatter.ts'
import type { CreateElement } from 'typings/renderer.ts'
import { createRichText } from './render.ts'
import type { RichTextBaseProps } from './types.ts'

/** {@linkcode RichTextBaseProps} plus the React-specific tag overrides. */
export type RichTextProps = RichTextBaseProps & {
  /** Extra ICU rich-text tags, merged over (and able to override) the built-in table
   * `RichText/tags.ts` provides — the same extensibility react-intl's own `defaultRichTextElements`
   * already had. Has no effect in `'markdown'` mode. */
  tags?: Record<string, RichTextTagFn<ReactNode>>
}

/**
 * Renders `content` — an ICU rich-text message (the default) or literal Markdown (`contentFormat:
 * 'markdown'`) — into real component output. Real implementation shared with the Preact binding via
 * `render.ts`'s own `createRichText` (see that file's own doc for how — hook injection, including
 * `useIntl` itself); import from `@zanix/space-ui/preact` instead for the Preact one, same contract,
 * same rendered behavior. A genuine legacy rescue, not a from-scratch new component — see this
 * package's own `CHANGELOG.md` for the legacy-vs-here comparison this design is built against.
 *
 * ## Built on `useIntl().formatRichText`, not a hand-rolled tag parser
 *
 * Legacy's own RichText was itself a thin wrapper around react-intl's ICU rich-text tag feature.
 * `@formatjs/intl` (this package's own existing, single formatting dependency) has that exact
 * mechanism natively — `formatRichText` (`intl/formatter.ts`) exposes it directly, deferred until
 * this component became its first real consumer, the same "build it once a real consumer needs
 * it" reasoning `usePosition` was deferred under until `Popover`. Requires `<IntlProvider>`,
 * uniformly, even in `'markdown'` mode — see `RichTextContentFormat`'s own doc for why that mode
 * doesn't actually use the formatter, and why requiring the provider anyway keeps the contract to
 * one invariant instead of a conditional one.
 *
 * ## `content` never loads a document itself — `doc` is gone, not silently dropped
 *
 * Legacy's own `doc` prop mixed filesystem/`fetch` loading, client-only state, and a real,
 * acknowledged-but-unresolved hydration-mismatch bug directly into this component. Rather than
 * drop that capability outright, it moved OUTSIDE this component entirely:
 * {@linkcode resolveRichTextDocument} (`RichText/resolve.ts`) is a standalone, `fetch`-based async
 * resolver a caller (typically a `@zanix/space` `loader`) calls on its own, handing `RichText`
 * already-resolved `content` — deterministic first render by construction, never legacy's own
 * client-only fetch state.
 *
 * ## Population (`<props>`) works the same way it always did, without the string round-trip
 *
 * See `props-sentinel.ts`'s own doc for the full mechanism — a `<props>key=val</props>` tag nested
 * inside any other tag hands it extra props, exactly like legacy, but via a typed sentinel value
 * instead of a restringified marker regex has to re-find — the two confirmed real bugs that came
 * from that round-trip (a literal `$` breaking the marker, plain text silently misparsed as
 * querystring) are structurally impossible here, not just patched.
 */
export const RichText: (props: RichTextProps) => ReactElement = createRichText<
  ReactElement,
  ReactNode
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useMemo, useIntl },
  Fragment,
)
