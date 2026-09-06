/**
 * `RichText` — see `./runtime/video`'s own `@module` doc for why this package's real
 * `@zanix/space`-dependent components each get their own single-component subpath (never a shared
 * combined `./runtime` barrel, removed as of this change). `RichText` resolves
 * `@zanix/space/assets-manifest`'s own `resolveAssetHref` directly too (`RichText/resolve.ts`,
 * used by `resolveRichTextDocument` below), AND composes `Image`'s and `Video`'s own `render.ts`
 * factories internally for its built-in `img`/`video` tags (`RichText/tags.ts`) — real,
 * intentional composition, not a barrel accident: `tags.ts` only ever imports `Image`'s/`Video`'s
 * shared, renderer-agnostic render logic (`createImage`/`createVideo`), never their own
 * per-renderer BINDING files (`Image/index.ts`/`Image/index.preact.ts`,
 * `Video/index.ts`/`Video/index.preact.ts`) — so importing `RichText` alone never pulls in
 * `Video`'s/`Image`'s own standalone component exports, only the render logic they already share.
 * Composing `Video` this way also means `RichText`'s own real footprint reaches
 * `@zanix/space/video-source` too (`Video/render.ts`'s own direct dependency, for
 * `detectVideoSource`/`buildProviderEmbedUrl`) — transitively, not a second direct import of its
 * own (confirmed via `deno info --json`, see the dependency-boundary test's own `RichText` row).
 * `RichText/tags.ts` also composes `Link`/`Button`/`CatalogIcon`/`SocialNetworks`/`ImgButton`/
 * `IFrame`/`Skeleton`'s own `render.ts` factories the same way, for its remaining built-in tags —
 * none of those reach `@zanix/space` on their own.
 *
 * ## Considered and rejected: a comet-safe root-barrel `RichText`, mirroring `Image`/`Video`
 *
 * Investigated once `Image`'s/`Video`'s own `render.ts` factories got the injectable-resolver
 * treatment (see `Image/render.ts`'s own module doc): could `RichText` get the same two-binding
 * shape, since `tags.ts`'s `createImage(h, resolveAssetHref)`/`createVideo(h, resolveAssetHref)`
 * calls (this file's own composition, above) could mechanically accept an optional resolver the
 * same way. Two real facts confirmed directly, not assumed: `resolveRichTextDocument` (this file's
 * own re-export, `RichText/resolve.ts`) is NOT reached by `RichText`'s own component render path at
 * all (`RichText/index.ts`/`render.ts` never import `resolve.ts`) — it's already the "resolve
 * outside, hand `RichText` an already-built string" shape a comet-safe binding would need, so it
 * isn't itself an obstacle. And every OTHER built-in tag (`a`/`btn`/`icon`/`sn`/`ibtn`/`ifrm`/`sus`/
 * the plain structural tags) already has zero `@zanix/space` dependency of its own.
 *
 * Rejected anyway, for a reason specific to `RichText` that doesn't apply to `Image`/`Video`: their
 * own comet-safe binding degrades along exactly ONE prop (`src`) the caller directly controls and
 * can trivially guarantee is already absolute. `RichText`'s `img`/`video` resolution instead applies
 * to asset paths embedded INSIDE dynamic, often caller-uncontrolled content (CMS/translated
 * markdown or ICU text) — there's no single prop to pre-resolve, and no reliable way for a caller to
 * guarantee every embedded reference is already absolute before render. A relative path silently
 * failing to resolve there is a much less discoverable failure mode than `Image`'s own single,
 * deliberate prop-level choice. The real want behind "interactive rich text inside a Comet" is
 * already served without this: resolve `RichText`'s own output server-side and pass the
 * already-rendered result into a Comet as plain children, with the Comet owning only the
 * interactive shell (a collapse/expand toggle, a "read more" boundary) around it — never
 * `RichText`'s own parsing inside the Comet. No confirmed real consumer need has asked for anything
 * more than that. Revisit only against a genuine, confirmed consumer requirement, not renewed
 * convenience — the same bar `Menu`'s own `visual` change was held to before it was added.
 *
 * ## `markdownTags` closes the one real, narrower gap the decision above surfaced
 *
 * ICU mode already had a caller escape hatch for the exact case above — `RichTextProps`'s own
 * `tags` prop lets a caller override the built-in `img`/`video` tags with their own. `'markdown'`
 * mode used to have no equivalent: `renderMarkdown` hard-coded its own `Image`/`Video` calls with
 * no injection point of any kind. `RichTextProps.markdownTags` (`RichText/markdown.ts`'s own
 * `MarkdownTags<Node>`) closes that, purely additively — no effect on any caller not using it,
 * since `renderMarkdown`'s built-in `Image`/`Video` composition is unchanged when no override is
 * given. Deliberately NOT typed as `Record<string, RichTextTagFn<Node>>` (ICU mode's own `tags`
 * shape) — a real structural divergence, not an inconsistency: see `MarkdownTags`'s own doc for why
 * an ICU tag's "attributes" live in its own children (`chunks`, read back out via
 * `extractRichTextProps`), while a markdown image/video node's `src`/`alt`/`title`/extra
 * `_props[...]` are already flat, resolved values by the time its own handler runs — a props
 * object, not a chunks array, is what an override actually needs here. `link` gets no equivalent
 * override, deliberately: `Link` already has zero `@zanix/space` dependency of its own, so there's
 * no reason for a caller to need one.
 *
 * **Not a comet-safety mechanism of any kind — `RichText` stays exactly as comet-UNSAFE as the
 * "Considered and rejected" section above already establishes, `tags`/`markdownTags` or not.** Both
 * are pure SSR rendering customizations: a caller CAN hand either one a function that happens to
 * compose the comet-safe root-barrel `Image`/`Video` (or literally anything else — a custom
 * wrapper, a hard "reject any relative URL" policy for untrusted CMS content, whatever), but that
 * only changes what gets rendered for one call, on the server; it changes nothing about which
 * modules `RichText/tags.ts`/`markdown.ts` themselves reach. Both files keep their own top-level,
 * UNCONDITIONAL `import { resolveAssetHref } from '@zanix/space/assets-manifest'` as the fallback
 * used whenever `tags.img`/`tags.video`/`markdownTags.img`/`markdownTags.video` is NOT given — a
 * static ES import is hoisted regardless of whether any given instance's own props ever exercise
 * that fallback path, exactly the same lesson this whole round of work is built on for `Image`/
 * `Video` themselves. Confirmed directly, not assumed: `deno info --json src/runtime/rich-text.ts`
 * resolves the exact same three `@zanix/space` files before and after `markdownTags` existed —
 * `assets-manifest`, `video-source`, and `video-source`'s own transitive `content-type.ts` — zero
 * change to this file's own module graph. `RichText` remains `./runtime`-only, never importable
 * from a `'use comet'` file, with or without either override prop.
 *
 * @module
 */

export { RichText } from 'components/RichText/index.ts'
export type { RichTextProps } from 'components/RichText/index.ts'
export type { RichTextBaseProps, RichTextContentFormat } from 'components/RichText/types.ts'
export { resolveRichTextDocument } from 'components/RichText/resolve.ts'
export type { ResolveRichTextDocumentOptions } from 'components/RichText/resolve.ts'
export type { MarkdownTagProps, MarkdownTags } from 'components/RichText/markdown.ts'
// The one piece of `RichText`'s own internals exported standalone — the sanctioned way a custom
// tag passed through `RichText`'s own `tags` prop participates in population the same uniform way
// every built-in tag does. Renderer-agnostic (no `h`/`createElement` involved), same export in
// both entrypoints.
export { extractRichTextProps } from 'components/RichText/props-sentinel.ts'
