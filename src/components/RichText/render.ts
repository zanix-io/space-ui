import type { CreateElement } from 'typings/renderer.ts'
import type { Formatter, RichTextTagFn } from 'intl/formatter.ts'
import { renderMarkdown } from './markdown.ts'
import type { MarkdownTags } from './markdown.ts'
import { createRichTextTags } from './tags.ts'
import type { RichTextBaseProps } from './types.ts'

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 *
 * `useIntl` is itself injected too, not imported directly — already a per-renderer pair
 * (`intl/index.ts`/`.preact.ts`, body-identical apart from which module its own `useContext` comes
 * from), so `index.ts`/`index.preact.ts` each pass their own already-bound one in, the same way
 * `Popover/render.ts`'s own `PopoverHooks` already does for `usePosition`.
 */
export type RichTextHooks = {
  useMemo: <T>(fn: () => T, deps: unknown[]) => T
  useIntl: () => Formatter
}

/** {@linkcode RichTextBaseProps} plus the renderer-specific tag overrides, generic over the
 * renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as their own public
 * `RichTextProps`, with `ReactNode`/`ComponentChildren`. */
export type RichTextRenderProps<Node> = RichTextBaseProps & {
  tags?: Record<string, RichTextTagFn<Node>>
  /** `'markdown'` mode's own analog of {@linkcode tags} — see `markdown.ts`'s own `MarkdownTags`
   * doc for the full contract and why its shape necessarily differs from `RichTextTagFn`. No
   * effect in `'icu'` mode. */
  markdownTags?: MarkdownTags<Node>
}

/**
 * The real implementation of `RichText`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`, extended with `useIntl` injected alongside `useMemo` (see
 * {@linkcode RichTextHooks}'s own doc). `tags.ts`'s own `createRichTextTags`/`markdown.ts`'s own
 * `renderMarkdown` were ALREADY shared, renderer-agnostic modules parametrized by `h` alone before
 * this refactor (the same "parameterized by `h`" pattern `createCatalogIcon` establishes) — nothing
 * about them needed to change; this file is what brings the component's own body (previously
 * duplicated only for which module `useIntl`/`h`/`Fragment` came from) into the same shape.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (built on
 * `useIntl().formatRichText`, `doc` moved out to `resolveRichTextDocument`, population via
 * `<props>`'s typed sentinel, `'markdown'` mode never running `content` through ICU parsing first)
 * — not repeated here.
 */
export function createRichText<E, Node>(
  h: CreateElement<E>,
  hooks: RichTextHooks,
  Fragment: unknown,
): (props: RichTextRenderProps<Node>) => E {
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E
  // `createRichTextTags`/`renderMarkdown` build `Node` (`ReactNode`/`ComponentChildren`) content —
  // structurally the SAME underlying `createElement`/`h` call as `hAny` above, only typed against
  // the wider `Node` return instead of the real element type `E` this component itself returns
  // (its own `Fragment`-wrapped root). Same cast `index.ts`'s own local `h` alias already needed
  // before this refactor, moved here unchanged.
  const hNode = h as unknown as CreateElement<Node>

  return function RichText(props: RichTextRenderProps<Node>): E {
    const { content, contentFormat = 'icu', values, tags: customTags, markdownTags } = props
    const { formatRichText } = hooks.useIntl()

    const builtInTags = hooks.useMemo(() => createRichTextTags<Node>(hNode), [])

    if (contentFormat === 'markdown') {
      return hAny(Fragment, {}, ...renderMarkdown(hNode, content, markdownTags))
    }

    const allTags = { ...builtInTags, ...customTags }
    const result = formatRichText(content, allTags, values)

    if (Array.isArray(result)) return hAny(Fragment, {}, ...result)
    return hAny(Fragment, {}, result)
  }
}
