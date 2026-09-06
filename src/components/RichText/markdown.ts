import { parser, RuleType } from 'markdown-to-jsx/markdown'
import type { MarkdownToJSX } from 'markdown-to-jsx/markdown'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import { createLink } from '../Link/render.ts'
import { createImage } from '../Image/render.ts'
import { createVideo } from '../Video/render.ts'
import { isPlainObject } from '@zanix/helpers'
import { parsePropsQuery } from './parse-props-query.ts'
import type { CreateElement } from 'typings/renderer.ts'

type ASTNode = MarkdownToJSX.ASTNode

/** The already-resolved props a markdown image/video node hands to its own handler — `key`, `src`
 * (both always present), plus whatever `_props[...]`-namespaced extra props
 * {@linkcode extractUrlProps} pulled off the URL itself. Never a chunks/children array — see
 * {@linkcode MarkdownTags}'s own doc for why that's a deliberate, real divergence from ICU mode's
 * `RichTextTagFn`, not an oversight. */
export type MarkdownTagProps = Record<string, unknown> & { key: number; src: string }

/**
 * The markdown-mode analog of `RichText`'s own ICU-mode `tags` prop — an additive, opt-in override
 * for the two node kinds `renderMarkdown` composes `Image`/`Video` for internally, keyed by the
 * SAME `img`/`video` names `RichText/tags.ts`'s own ICU table uses. Typical uses: composing a
 * caller-owned `Image`/`Video`-shaped element, enforcing a stricter policy than the built-in
 * auto-resolve default (e.g. rejecting any relative URL outright for untrusted CMS content), or
 * swapping in an entirely different visual — the same real motivation `Menu`'s/`ImgButton`'s/
 * `Card`'s own `visual` render-props already have, applied here to markdown's own fixed image/video
 * AST node instead of a plain component prop.
 *
 * **Not a comet-safety mechanism of any kind** — this is a pure SSR rendering customization, full
 * stop. When NO override is given, `renderMarkdown`'s own default path calls `createImage`/
 * `createVideo` (`Image/render.ts`'s/`Video/render.ts`'s own shared factories) WITH this module's
 * own top-level `resolveAssetHref` injected — the SSR-only, auto-resolving binding, never the
 * separate comet-safe root-barrel `Image`/`Video` (`components/Image/index.ts`, no resolver
 * injected) — so a relative path keeps auto-resolving exactly as before this override existed. That
 * `resolveAssetHref` import stays real and UNCONDITIONAL regardless of whether any given instance's
 * own props actually use `img`/`video` here — a static ES import is hoisted no matter what a caller
 * passes — so `RichText/markdown.ts`'s own module (and therefore `RichText` itself) keeps reaching
 * `@zanix/space/assets-manifest` either way. A caller's own override function MAY happen to compose
 * the comet-safe root-barrel `Image`/`Video` for what it renders, but that only affects the output
 * of one SSR call — it does not, and cannot, remove `RichText`'s own unconditional dependency on
 * this file's own fallback import. See `src/runtime/rich-text.ts`'s own module doc for the full
 * reasoning and a `deno info --json` confirmation that `RichText`'s own module graph is identical
 * with or without this feature.
 *
 * Deliberately NOT typed as `Record<string, RichTextTagFn<E>>` (ICU mode's own `tags` prop type) —
 * a real structural divergence, not an inconsistency: `RichTextTagFn<T> = (chunks: Array<string |
 * T>) => T` is `@formatjs/intl`'s own native rich-text tag dispatch shape. ICU tags have no
 * attribute syntax of their own, so an ICU-authored `img`/`video` tag carries its `src`/etc. as a
 * NESTED `<props>` tag inside its own children — `chunks` IS where those attributes live, read back
 * out via `extractRichTextProps`. Markdown's `![alt](src)` syntax has no children/chunks at all:
 * `src`/`alt`/`title`/any `_props[...]`-namespaced extra prop are already fully resolved, flat
 * values by the time a markdown image/video node's own handler runs (see {@linkcode extractUrlProps}).
 * Forcing `RichTextTagFn`'s chunks-based shape onto this handler would mean either discarding that
 * real data (a chunks array carries no `src`/`alt` of its own) or fabricating a synthetic
 * single-item chunks array purely to satisfy an incompatible calling convention, for no real benefit
 * over handing the override function the exact same already-resolved props object the built-in
 * `Image`/`Video` call itself receives.
 *
 * `link` has no equivalent override here, deliberately: `Link` (unlike `Image`/`Video`) already has
 * zero `@zanix/space` dependency of its own — there's no reason for a caller to need to substitute
 * markdown's own built-in link handling, so the same reasoning that justifies `img`/`video` here
 * doesn't extend to it.
 */
export type MarkdownTags<E> = {
  /** Overrides markdown's built-in image-node handling — `Image({ key, alt: node.alt ?? '',
   * ...props, src })` by default, using `Image/render.ts`'s own shared factory with
   * `resolveAssetHref` injected (the SSR-only, auto-resolving binding — see this type's own doc for
   * why this is never comet-safe, with or without an override here). Never called for a node
   * `isVideo` classifies as a video instead — see {@linkcode video}. */
  img?: (props: MarkdownTagProps & { alt?: string }) => E
  /** Overrides markdown's built-in video-node handling — an image node whose own extracted
   * `_props` has a truthy `video`/`media` (see this module's own "`_props`-on-URL convention" doc)
   * — `Video({ key, title: node.alt, ...props, src })` by default. */
  video?: (props: MarkdownTagProps & { title?: string }) => E
}

/**
 * Markdown support, built on `markdown-to-jsx`'s own `/markdown` subpath — its `parser()` is a
 * pure markdown→AST function with zero React dependency at runtime, despite its `.d.ts`'s purely
 * type-level `import * as React` and the package's own React-flavored root/`./react` entrypoint.
 * This module walks that AST itself via
 * `h`, the same "parameterized by h" pattern `CatalogIcon`'s own `createCatalogIcon` already
 * establishes — never markdown-to-jsx's own JSX renderer, which is why this works through Preact
 * without ever touching `preact/compat`, unlike a naive integration would.
 *
 * Deliberately covers the common node kinds a real CMS/docs document needs — paragraphs,
 * headings, emphasis/strong/strikethrough/inline code, links, images, fenced/inline code, ordered/
 * unordered lists, blockquotes, line/thematic breaks — not the full AST. Tables, footnotes, GFM
 * task lists, frontmatter, and raw HTML/JSX blocks are not rendered in this first version (no
 * silent cap: `renderMarkdownNode` returns `null` for them, a real, disclosed v1 scope limit, not
 * a hidden gap — see this module's own CHANGELOG entry).
 *
 * ## The same `_props`-on-URL convention legacy's own `MDLink`/`MDMedia` established, unified
 *
 * A markdown link/image URL can carry a `_props[...]` bracket-namespaced query segment
 * (`![caption](clip.mp4?_props[video]=true)`) that never reaches the real `src`/`href` — stripped
 * and parsed via the SAME {@linkcode parsePropsQuery} the ICU-side `<props>` tag already uses (one
 * shared parser, not legacy's own two parallel implementations), then spread onto the target
 * component. A link with `video`/`media` truthy in its extracted props renders `Video`; otherwise
 * an image renders `Image`, a link renders `Link`.
 *
 * Every plain host element this renders (`p`, `h1`–`h6`, emphasis/strong/strikethrough, `code`/
 * `pre`, `ul`/`ol`/`li`, `blockquote`, `br`/`hr`) carries `data-space-ui="richtext"` — the same
 * default `RichText/tags.ts`'s own basic ICU tags have, and for the identical reason: none of
 * these delegate to a real space-ui component the way `Link`/`Image`/`Video` do, so nothing else
 * provides a stable selector hook for them. `Link`/`Image`/`Video` themselves are untouched here —
 * they already carry their own, more specific `data-space-ui` from their real components.
 */
export function renderMarkdown<E>(
  h: CreateElement<E>,
  source: string,
  tags?: MarkdownTags<E>,
): Array<string | E> {
  const nodes = parser(source)
  return renderMarkdownNodes(h, nodes, tags)
}

function renderMarkdownNodes<E>(
  h: CreateElement<E>,
  nodes: ASTNode[],
  tags?: MarkdownTags<E>,
): Array<string | E> {
  return nodes
    .map((node, index) => renderMarkdownNode(h, node, index, tags))
    .filter((node): node is string | E => node !== null)
}

function renderMarkdownNode<E>(
  h: CreateElement<E>,
  node: ASTNode,
  key: number,
  tags?: MarkdownTags<E>,
): string | E | null {
  switch (node.type) {
    case RuleType.text:
      return node.text

    case RuleType.textFormatted:
      return h(
        node.tag,
        { key, 'data-space-ui': 'richtext' },
        ...renderMarkdownNodes(h, node.children, tags),
      )

    case RuleType.paragraph:
      return h(
        'p',
        { key, 'data-space-ui': 'richtext' },
        ...renderMarkdownNodes(h, node.children, tags),
      )

    case RuleType.heading:
      return h(
        `h${node.level}`,
        { key, id: node.id, 'data-space-ui': 'richtext' },
        ...renderMarkdownNodes(h, node.children, tags),
      )

    case RuleType.link: {
      if (node.target === null) return renderMarkdownNodes(h, node.children, tags).join('')
      const { src, props } = extractUrlProps(node.target)
      const Link = createLink(h)
      return Link({
        key,
        href: src,
        title: node.title,
        ...props,
        children: renderMarkdownNodes(h, node.children, tags) as never,
      } as never)
    }

    case RuleType.image: {
      if (node.target === null) return null
      const { src, props } = extractUrlProps(node.target)
      const isVideo = Boolean(props.video || props.media)
      // `resolveAssetHref` injected explicitly — `Image`/`Video`'s own `createImage`/`createVideo`
      // factories no longer hardcode this import (see `Image/render.ts`'s own module doc), so a
      // markdown image/video needs it injected here too, to keep auto-resolving a relative asset
      // path embedded in caller-uncontrolled content exactly as it always has. This file's own
      // top-level `resolveAssetHref` import (above) stays real and UNCONDITIONAL regardless of
      // whether `tags?.img`/`tags?.video` is given for any particular node below — a static ES
      // import is hoisted no matter what a caller passes, so this module (and `RichText` itself)
      // never becomes comet-safe either way, same reasoning `tags.ts`'s own doc gives; see
      // `MarkdownTags`'s own doc for the full "not a comet-safety mechanism" reasoning. When an
      // override IS given, it only changes what THIS specific node renders (skipping the
      // `createImage`/`createVideo` call for it) — it changes nothing about this file's own module
      // graph.
      if (isVideo) {
        if (tags?.video) return tags.video({ key, title: node.alt, ...props, src })
        const Video = createVideo(h, resolveAssetHref)
        return Video({ key, title: node.alt, ...props, src } as never)
      }
      if (tags?.img) return tags.img({ key, alt: node.alt ?? '', ...props, src })
      const Image = createImage(h, resolveAssetHref)
      return Image({ key, alt: node.alt ?? '', ...props, src } as never)
    }

    case RuleType.codeInline:
      return h('code', { key, 'data-space-ui': 'richtext' }, node.text)

    case RuleType.codeBlock: {
      const codeProps: Record<string, unknown> = { 'data-space-ui': 'richtext' }
      if (node.lang) codeProps.className = `language-${node.lang}`
      return h('pre', { key, 'data-space-ui': 'richtext' }, h('code', codeProps, node.text))
    }

    case RuleType.orderedList:
      return h(
        'ol',
        { key, start: node.start, 'data-space-ui': 'richtext' },
        ...node.items.map((item, index) =>
          h(
            'li',
            { key: index, 'data-space-ui': 'richtext' },
            ...renderMarkdownNodes(h, item, tags),
          )
        ),
      )

    case RuleType.unorderedList:
      return h(
        'ul',
        { key, 'data-space-ui': 'richtext' },
        ...node.items.map((item, index) =>
          h(
            'li',
            { key: index, 'data-space-ui': 'richtext' },
            ...renderMarkdownNodes(h, item, tags),
          )
        ),
      )

    case RuleType.blockQuote:
      return h(
        'blockquote',
        { key, 'data-space-ui': 'richtext' },
        ...renderMarkdownNodes(h, node.children, tags),
      )

    case RuleType.breakLine:
      return h('br', { key, 'data-space-ui': 'richtext' })

    case RuleType.breakThematic:
      return h('hr', { key, 'data-space-ui': 'richtext' })

    // Deliberately unhandled in this first version — see this module's own doc.
    case RuleType.table:
    case RuleType.footnote:
    case RuleType.footnoteReference:
    case RuleType.gfmTask:
    case RuleType.frontmatter:
    case RuleType.htmlComment:
    case RuleType.htmlBlock:
    case RuleType.htmlSelfClosing:
    case RuleType.ref:
    case RuleType.refCollection:
      return null

    default:
      return null
  }
}

/** Splits a markdown link/image URL into its real `src` and any `_props[...]`-namespaced extra
 * props — the same convention legacy's own `MDLink`/`MDMedia` established, reimplemented on the
 * one shared {@linkcode parsePropsQuery} parser instead of a second, parallel implementation. */
function extractUrlProps(url: string): { src: string; props: Record<string, unknown> } {
  const [path, query] = url.split('?')
  if (!query) return { src: url, props: {} }

  const parsed = parsePropsQuery(query)
  const { _props, ...rest } = parsed
  const props = isPlainObject(_props) ? _props : {}

  const remainingEntries = Object.entries(rest).map(([k, v]) => [k, String(v)] as [string, string])
  const remainingQuery = new URLSearchParams(remainingEntries).toString()
  const src = remainingQuery ? `${path}?${remainingQuery}` : path

  return { src, props }
}
