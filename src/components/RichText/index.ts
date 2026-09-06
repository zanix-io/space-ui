import { createElement, Fragment, useMemo } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useIntl } from 'intl/index.ts'
import type { RichTextTagFn } from 'intl/formatter.ts'
import type { CreateElement } from 'typings/renderer.ts'
import { createRichText } from './render.ts'
import type { MarkdownTags } from './markdown.ts'
import type { RichTextBaseProps } from './types.ts'

/** {@linkcode RichTextBaseProps} plus the React-specific tag overrides. */
export type RichTextProps = RichTextBaseProps & {
  /** Extra ICU rich-text tags, merged over (and able to override) the built-in table
   * `RichText/tags.ts` provides — the same extensibility react-intl's own `defaultRichTextElements`
   * already had. Has no effect in `'markdown'` mode; see {@linkcode markdownTags} for that mode's
   * own equivalent. A pure SSR rendering customization — see {@linkcode markdownTags}'s own doc for
   * why this is never a comet-safety mechanism of any kind, `RichText` remains `./runtime`-only
   * regardless of whether either override is used. */
  tags?: Record<string, RichTextTagFn<ReactNode>>
  /** `'markdown'`-mode-only analog of {@linkcode tags} — an additive, opt-in override for
   * markdown's own built-in `img`/`video` node handling. Typical uses: composing a caller-owned
   * `Image`/`Video`-shaped element, enforcing a stricter policy (e.g. rejecting any relative URL
   * outright for untrusted CMS content) than the built-in auto-resolve default, or swapping in an
   * entirely different visual. See `markdown.ts`'s own `MarkdownTags` doc for the full contract, and
   * why its shape necessarily differs from `RichTextTagFn`. No effect in `'icu'` mode.
   *
   * **Not a comet-safety mechanism** — this only changes what a single SSR call renders, never
   * which modules `RichText`'s own files reach: `RichText/tags.ts`/`markdown.ts` keep their own
   * unconditional `resolveAssetHref` import as the fallback used whenever an override isn't given,
   * a static ES import hoisted regardless of any instance's own props. `RichText` stays
   * `./runtime`-only, never importable from a `'use comet'` file, with or without this prop — see
   * `src/runtime/rich-text.ts`'s own module doc for the full reasoning and the `deno info --json`
   * confirmation. */
  markdownTags?: MarkdownTags<ReactNode>
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
 *
 * ## `markdownTags` — `'markdown'` mode's own override hatch, the analog of `tags`
 *
 * `'icu'` mode has always let a caller override the built-in `img`/`video` tags via `tags`;
 * `'markdown'` mode gets the equivalent capability via `markdownTags` — additive, opt-in, no effect
 * on any caller not using it. See `markdown.ts`'s own `MarkdownTags` doc for why its shape is a
 * props object rather than `RichTextTagFn`'s chunks array (a real structural divergence from ICU's
 * own tag-dispatch mechanism, not an inconsistency).
 *
 * **Neither `tags` nor `markdownTags` makes `RichText` usable inside a `'use comet'` file** — both
 * are pure SSR rendering customizations. The example below happens to compose the comet-safe
 * root-barrel `Image` inside the override function, purely because that's a convenient, correct
 * choice for whatever gets rendered — it does NOT mean this `RichText` call itself becomes
 * comet-safe: `RichText/markdown.ts`'s own fallback `resolveAssetHref` import (used whenever
 * `markdownTags.img` isn't given) stays a real, unconditional dependency of this component's own
 * module regardless, confirmed via `deno info --json` — see `src/runtime/rich-text.ts`'s own module
 * doc for the full reasoning.
 *
 * @example
 * ```tsx
 * <RichText
 *   content={markdownSource}
 *   contentFormat="markdown"
 *   markdownTags={{
 *     img: ({ key, src, alt }) => <Image key={key} src={src} alt={alt ?? ''} />,
 *   }}
 * />
 * ```
 */
export const RichText: (props: RichTextProps) => ReactElement = createRichText<
  ReactElement,
  ReactNode
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useMemo, useIntl },
  Fragment,
)
