import { Fragment, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useMemo } from 'preact/hooks'
import { useIntl } from 'intl/index.preact.ts'
import type { RichTextTagFn } from 'intl/formatter.ts'
import type { CreateElement } from 'typings/renderer.ts'
import { createRichText } from './render.ts'
import type { MarkdownTags } from './markdown.ts'
import type { RichTextBaseProps } from './types.ts'

/** {@linkcode RichTextBaseProps} plus the Preact-specific tag overrides. */
export type RichTextProps = RichTextBaseProps & {
  /** ICU-mode-only — see `index.ts`'s own `RichTextProps.tags` doc. No effect in `'markdown'`
   * mode; see {@linkcode markdownTags} for that mode's own equivalent. */
  tags?: Record<string, RichTextTagFn<ComponentChildren>>
  /** `'markdown'`-mode-only — see `markdown.ts`'s own `MarkdownTags` doc for the full contract.
   * No effect in `'icu'` mode. */
  markdownTags?: MarkdownTags<ComponentChildren>
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (built on
 * `useIntl().formatRichText`, `doc` moved out to `resolveRichTextDocument`, population via
 * `<props>`'s typed sentinel, `'markdown'` mode never running `content` through ICU parsing first)
 * — not repeated here. Same contract, same rendered behavior, real implementation shared with the
 * React binding via `render.ts`'s own `createRichText` (hook injection — see that file's own doc
 * for why that's sound) — never `preact/compat`, including for Markdown rendering itself
 * (`markdown.ts`'s own doc covers why that specifically matters here).
 */
export const RichText: (props: RichTextProps) => VNode = createRichText<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useMemo, useIntl },
  Fragment,
)
