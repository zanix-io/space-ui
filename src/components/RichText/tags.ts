import type { RichTextTagFn } from 'intl/formatter.ts'
import { createLink } from '../Link/render.ts'
import { createButton } from '../Button/render.ts'
import { createCatalogIcon } from '../CatalogIcon/render.ts'
import { CATALOG_VIEWBOX } from '../CatalogIcon/types.ts'
import { createSocialNetworks } from '../SocialNetworks/render.ts'
import { createImage } from '../Image/render.ts'
import { createImgButton } from '../ImgButton/render.ts'
import { createIFrame } from '../IFrame/render.ts'
import { createVideo } from '../Video/render.ts'
import { createSkeleton } from '../Skeleton/render.ts'
import { createRichTextPropsSentinel, extractRichTextProps } from './props-sentinel.ts'
import { isPlainObject, sanitizeUrl } from '@zanix/helpers'
import type { CreateElement } from 'typings/renderer.ts'

/** Every plain structural/text HTML tag legacy content already authors — same short names, kept
 * verbatim (real existing `.doc`/catalog content already uses these; renaming would be a pure
 * compatibility break for zero benefit). Unlike the "zanix component" tags below (`a`, `img`,
 * `video`, …), none of these delegate to a real space-ui component that already carries its own
 * `data-space-ui` — there's no `Link`/`Image` in between to inherit one from, the same reason
 * `CatalogIcon` doesn't add a SECOND identity on top of `Icon`'s own. So these get
 * `data-space-ui="richtext"` directly, as a genuine default (overridable via `<props>`, same
 * last-write-wins contract as everything else `<props>` sets) — the identical "stable selector
 * without a bare element selector" justification every other `data-space-ui` in this package
 * already has, applied here because nothing else provides it for plain HTML output. */
const BASIC_TAGS: Record<string, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  n: 'nav',
  p: 'p',
  b: 'strong',
  i: 'em',
  u: 'u',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  del: 'del',
  span: 'span',
  div: 'div',
  ar: 'article',
  se: 'section',
  ma: 'main',
}

/**
 * The built-in ICU rich-text tag → renderer table `RichText` passes to `formatRichText`, and the
 * point every tag mapping decision from the legacy audit resolves: kept verbatim where a real
 * space-ui component already exists (`a`→`Link`, `btn`→`Button`, `sn`→`SocialNetworks`,
 * `img`→`Image`, `ibtn`→`ImgButton`, `ifrm`→`IFrame`), changed where the new package's own
 * component is the better fit (`icon`→`CatalogIcon`, not `Icon` — content authors get named icons
 * with no `href`/`viewBox` to manage), fixed where legacy was a confirmed, unconditional
 * self-recursion crash bug that never actually worked (`video`→the REAL `Video` component, not
 * legacy's own broken self-reference), repurposed where legacy's own target was React-Suspense-
 * specific and never migrated (`sus`→`Skeleton`, same "loading placeholder" intent, backed by a
 * real both-renderer component), and dropped where no real target exists in this package at all
 * (`page`, `lc`/`LayoutContainer` — the former also shared `video`'s own crash bug, and this
 * package doesn't own page-level composition regardless — that's application-level layout, outside
 * any single component's responsibility here; `menu` too —
 * `Menu` has no renderer-agnostic `render.ts` factory the way every other target here does, since
 * it needs real per-renderer hooks, and no consumer evidence has asked for it inside rich text
 * specifically).
 *
 * Every tag calls {@linkcode extractRichTextProps} on its own `chunks` uniformly — no tag here is
 * special-cased the way legacy's own `type: 'element' | 'component'` distinction was, which is
 * exactly what makes the "plain text silently swallowed and misparsed" bug class structurally
 * impossible now (see `props-sentinel.ts`'s own doc). Only `a`/`btn` render their own remaining
 * `children` — every other target tag's own remaining children are intentionally discarded (none
 * of `CatalogIcon`/`SocialNetworks`/`Image`/`ImgButton`/`IFrame`/`Video`/`Skeleton` render
 * `children` at all; all of their real content comes from props).
 *
 * Every `href`/`src` a tag reads out of `<props>` — `a`, `img`, `ibtn`, `ifrm`, `video`, and each
 * entry's `url` in `sn`'s `links` array — goes through {@linkcode sanitizeUrl} first: `<props>`
 * content is author-controlled (CMS, translations, UGC), and none of it is trusted to carry a
 * `javascript:`/`vbscript:`/non-image-`data:` scheme through to the DOM.
 */
export function createRichTextTags<E>(h: CreateElement<E>): Record<string, RichTextTagFn<E>> {
  const Link = createLink(h)
  const Button = createButton(h)
  const Icon = createCatalogIcon(h, CATALOG_VIEWBOX)
  const SocialNetworks = createSocialNetworks(h)
  const Image = createImage(h)
  const ImgButton = createImgButton(h)
  const IFrame = createIFrame(h)
  const Video = createVideo(h)
  const Skeleton = createSkeleton(h)

  const tags: Record<string, RichTextTagFn<E>> = {
    // The `<props>` tag itself — see `props-sentinel.ts`'s own doc for the full mechanism. Its own
    // "children" are its raw querystring-shaped text content, joined back into one string (FormatJS
    // splits interleaved text into separate chunks even within a single tag's own content).
    props: (chunks) => createRichTextPropsSentinel(chunks.join('')) as unknown as E,

    br: (chunks) => {
      const { props } = extractRichTextProps(chunks)
      return h('br', { 'data-space-ui': 'richtext', ...props })
    },

    a: (chunks) => {
      const { props, children } = extractRichTextProps(chunks)
      return Link({ ...props, href: sanitizeUrl(props.href ?? ''), children } as never)
    },

    btn: (chunks) => {
      const { props, children } = extractRichTextProps(chunks)
      return Button({ ...props, children } as never)
    },

    icon: (chunks) => {
      const { props } = extractRichTextProps(chunks)
      return Icon(props as never)
    },

    sn: (chunks) => {
      const { props } = extractRichTextProps(chunks)
      // `links` is a real required prop `SocialNetworks` itself reads `.length` off directly, no
      // internal default — same reason every other prop-only tag here seeds its own required
      // fields (`a`'s `href: ''`, `img`'s `src: ''`/`alt: ''`, `ifrm`'s `src: ''`/`title: ''`).
      // Missing it entirely (`<sn></sn>` with no `<props>`) is a real, confirmed bug fixed here,
      // not a hypothetical: without this default, `SocialNetworks` throws reading `undefined
      // .length` before ever reaching its own "empty list" `null` return below — the `?? h('span',
      // null)` fallback was unreachable dead code as a result, since the crash happened first.
      const links = Array.isArray(props.links)
        ? props.links.map((link) =>
          isPlainObject(link) ? { ...link, url: sanitizeUrl(link.url) } : link
        )
        : []
      return SocialNetworks({ ...props, links } as never) ?? h('span', null)
    },

    img: (chunks) => {
      const { props } = extractRichTextProps(chunks)
      return Image({ alt: '', ...props, src: sanitizeUrl(props.src ?? '') } as never)
    },

    ibtn: (chunks) => {
      const { props } = extractRichTextProps(chunks)
      // `href` stays absent (not defaulted to `''`) when the author didn't set one — ImgButton
      // renders a real Button instead of a Link in that case. `sanitizeUrl` preserves that:
      // it only touches an actual string value, leaving `undefined` untouched.
      return ImgButton({ ...props, href: sanitizeUrl(props.href) } as never)
    },

    ifrm: (chunks) => {
      const { props } = extractRichTextProps(chunks)
      return IFrame({ title: '', ...props, src: sanitizeUrl(props.src ?? '') } as never)
    },

    video: (chunks) => {
      const { props } = extractRichTextProps(chunks)
      return Video({ ...props, src: sanitizeUrl(props.src ?? '') } as never) as E
    },

    sus: (chunks) => {
      const { props } = extractRichTextProps(chunks)
      return Skeleton(props as never)
    },
  }

  for (const [tagName, hostTag] of Object.entries(BASIC_TAGS)) {
    tags[tagName] = (chunks) => {
      const { props, children } = extractRichTextProps(chunks)
      return h(hostTag, { 'data-space-ui': 'richtext', ...props }, ...children)
    }
  }

  return tags
}
