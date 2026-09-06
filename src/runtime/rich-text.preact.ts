/**
 * `RichText`'s Preact binding — same props, same rendered markup as `./runtime/rich-text` (React).
 * See `./runtime/video`'s own `@module` doc for why this package's real `@zanix/space`-dependent
 * components each get their own single-component subpath, and this file's React counterpart for
 * exactly what `RichText`'s own module composes and why that's real, intentional coupling rather
 * than a barrel accident.
 *
 * @module
 */

export { RichText } from 'components/RichText/index.preact.ts'
export type { RichTextProps } from 'components/RichText/index.preact.ts'
export type {
  /** See `components/RichText/types.ts`'s own `RichTextBaseProps` for the full doc. */
  RichTextBaseProps,
  /** See `components/RichText/types.ts`'s own `RichTextContentFormat` for the full doc. */
  RichTextContentFormat,
} from 'components/RichText/types.ts'
export {
  /** See `components/RichText/resolve.ts`'s own `resolveRichTextDocument` for the full doc. */
  resolveRichTextDocument,
} from 'components/RichText/resolve.ts'
export type {
  /** See `components/RichText/resolve.ts`'s own `ResolveRichTextDocumentOptions` for the full doc. */
  ResolveRichTextDocumentOptions,
} from 'components/RichText/resolve.ts'
export type {
  /** See `components/RichText/markdown.ts`'s own `MarkdownTagProps` for the full doc. */
  MarkdownTagProps,
  /** See `components/RichText/markdown.ts`'s own `MarkdownTags` for the full doc. */
  MarkdownTags,
} from 'components/RichText/markdown.ts'
export {
  /** See `components/RichText/props-sentinel.ts`'s own `extractRichTextProps` for the full doc. */
  extractRichTextProps,
} from 'components/RichText/props-sentinel.ts'
