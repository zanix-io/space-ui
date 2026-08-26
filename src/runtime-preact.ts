/**
 * `@zanix/space-ui`'s Preact-bound components that have a REAL runtime dependency on
 * `@zanix/space` — same props, same rendered markup as `./runtime` (React). Import from here
 * instead of `./runtime` when your `@zanix/space` app uses `--renderer=preact`. See `./runtime`'s
 * own `@module` doc for why these six (`Video`, `Image`, `RichText`, `ImgButton`, `Card`, `Menu`)
 * live in a separate entrypoint at all, rather than the default `.`/`./preact` barrel.
 *
 * @module
 */

export { Video } from 'components/Video/index.preact.ts'
export type {
  /** See `components/Video/types.ts`'s own `VideoProps` for the full doc. */
  VideoProps,
  /** See `components/Video/types.ts`'s own `VideoSourceProps` for the full doc. */
  VideoSourceProps,
  /** See `components/Video/types.ts`'s own `VideoTrackProps` for the full doc. */
  VideoTrackProps,
} from 'components/Video/types.ts'

export { Image } from 'components/Image/index.preact.ts'
export type {
  /** See `components/Image/types.ts`'s own `ImageProps` for the full doc. */
  ImageProps,
  /** See `components/Image/types.ts`'s own `ImageSourceProps` for the full doc. */
  ImageSourceProps,
} from 'components/Image/types.ts'

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
export {
  /** See `components/RichText/props-sentinel.ts`'s own `extractRichTextProps` for the full doc. */
  extractRichTextProps,
} from 'components/RichText/props-sentinel.ts'

export { ImgButton } from 'components/ImgButton/index.preact.ts'
export type {
  /** See `components/ImgButton/types.ts`'s own `ImgButtonProps` for the full doc. */
  ImgButtonProps,
} from 'components/ImgButton/types.ts'

export { Card } from 'components/Card/index.preact.ts'
export type {
  /** See `components/Card/types.ts`'s own `CardImageProps` for the full doc. */
  CardImageProps,
  /** See `components/Card/types.ts`'s own `CardProps` for the full doc. */
  CardProps,
} from 'components/Card/types.ts'

export { Menu } from 'components/Menu/index.preact.ts'
export type {
  /** See `components/Menu/types.ts`'s own `MenuItem` for the full doc. */
  MenuItem,
  /** See `components/Menu/types.ts`'s own `MenuOpenMode` for the full doc. */
  MenuOpenMode,
  /** See `components/Menu/types.ts`'s own `MenuProps` for the full doc. */
  MenuProps,
} from 'components/Menu/types.ts'
