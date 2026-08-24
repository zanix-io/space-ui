import { parser, RuleType } from 'markdown-to-jsx/markdown'
import type { MarkdownToJSX } from 'markdown-to-jsx/markdown'
import { createLink } from '../Link/render.ts'
import { createImage } from '../Image/render.ts'
import { createVideo } from '../Video/render.ts'
import { isPlainObject } from '@zanix/helpers'
import { parsePropsQuery } from './parse-props-query.ts'
import type { CreateElement } from 'typings/renderer.ts'

type ASTNode = MarkdownToJSX.ASTNode

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
export function renderMarkdown<E>(h: CreateElement<E>, source: string): Array<string | E> {
  const nodes = parser(source)
  return renderMarkdownNodes(h, nodes)
}

function renderMarkdownNodes<E>(h: CreateElement<E>, nodes: ASTNode[]): Array<string | E> {
  return nodes
    .map((node, index) => renderMarkdownNode(h, node, index))
    .filter((node): node is string | E => node !== null)
}

function renderMarkdownNode<E>(h: CreateElement<E>, node: ASTNode, key: number): string | E | null {
  switch (node.type) {
    case RuleType.text:
      return node.text

    case RuleType.textFormatted:
      return h(
        node.tag,
        { key, 'data-space-ui': 'richtext' },
        ...renderMarkdownNodes(h, node.children),
      )

    case RuleType.paragraph:
      return h('p', { key, 'data-space-ui': 'richtext' }, ...renderMarkdownNodes(h, node.children))

    case RuleType.heading:
      return h(
        `h${node.level}`,
        { key, id: node.id, 'data-space-ui': 'richtext' },
        ...renderMarkdownNodes(h, node.children),
      )

    case RuleType.link: {
      if (node.target === null) return renderMarkdownNodes(h, node.children).join('')
      const { src, props } = extractUrlProps(node.target)
      const Link = createLink(h)
      return Link({
        key,
        href: src,
        title: node.title,
        ...props,
        children: renderMarkdownNodes(h, node.children) as never,
      } as never)
    }

    case RuleType.image: {
      if (node.target === null) return null
      const { src, props } = extractUrlProps(node.target)
      const isVideo = Boolean(props.video || props.media)
      if (isVideo) {
        const Video = createVideo(h)
        return Video({ key, title: node.alt, ...props, src } as never)
      }
      const Image = createImage(h)
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
          h('li', { key: index, 'data-space-ui': 'richtext' }, ...renderMarkdownNodes(h, item))
        ),
      )

    case RuleType.unorderedList:
      return h(
        'ul',
        { key, 'data-space-ui': 'richtext' },
        ...node.items.map((item, index) =>
          h('li', { key: index, 'data-space-ui': 'richtext' }, ...renderMarkdownNodes(h, item))
        ),
      )

    case RuleType.blockQuote:
      return h(
        'blockquote',
        { key, 'data-space-ui': 'richtext' },
        ...renderMarkdownNodes(h, node.children),
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
