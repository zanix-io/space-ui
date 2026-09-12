/** `'circle'` (default) or `'square'` — read as `data-shape` on the root element; the actual
 * `border-radius` this maps to lives in the optional `src/templates/shared/avatar.css` companion
 * (never imported by this component or any runtime code), the same "structural, color-free optional
 * CSS" precedent `src/templates/shared/card.css` already establishes for `Card`'s own responsive
 * layout — see that file's own header doc. Without it loaded, `Avatar` still renders fully valid,
 * correctly sized markup — just as a plain rectangle, never a broken or unstyled-looking one. */
export type AvatarShape = 'circle' | 'square'

/** Named size tokens — resolved to real pixels via {@linkcode AVATAR_SIZE_PX}, the same "small,
 * numeric/token-based scale" convention this component's own doc calls for. A plain `number` is
 * also accepted directly ({@linkcode AvatarBaseProps.size}) for a caller who needs an exact,
 * non-tokenized value. */
export type AvatarSize = 'sm' | 'md' | 'lg'

/** Real pixel value per named {@linkcode AvatarSize} — applied as this component's own `width`/
 * `height`, the same real CLS-prevention sizing mechanism `Image.width`/`Image.height` already are
 * (never a decorative default; see `render.ts`'s own doc). Exported as its own named config
 * constant, same "public, named lookup table" shape `CATALOG_VIEWBOX` already establishes, cased
 * accordingly (config, not behavior) even though every value here is a plain number. */
export const AVATAR_SIZE_PX: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
}

/** Props for {@linkcode Avatar}. See `render.ts`'s own doc for the full behavioral contract. */
export type AvatarBaseProps = {
  /** The person/entity's display name — used BOTH to derive the initials fallback (via this
   * component's own colocated `get-initials.ts`) and as the real accessible name in every case
   * (the image's own `alt`, or the fallback's own `aria-label`) — required for the same
   * "make forgetting an accessible name a compile error" reason `Image.alt`/`IFrame.title` already
   * are required. */
  name: string
  /** Optional avatar image URL — same resolution rules as the root-barrel, comet-safe `Image.src`
   * (an absolute URL passes through untouched; a relative path is NOT auto-resolved here — see
   * `render.ts`'s own doc). Omitted, or a real load failure, both show the initials fallback
   * derived from {@linkcode name}. */
  src?: string
  /** @default 'circle' */
  shape?: AvatarShape
  /** A named token ({@linkcode AVATAR_SIZE_PX}) or an explicit pixel number. @default 'md' */
  size?: AvatarSize | number
  id?: string
  className?: string
  /** CORS mode for the image request — same real platform attribute `Image`'s own `crossOrigin`
   * already exposes, forwarded through unchanged (`render.ts`'s own `Image({ ..., crossOrigin })`
   * call). Needed whenever `src` is a cross-origin URL served by a REST API that also sets
   * session-related cookies for that same host: with no `crossorigin` attribute at all, a plain
   * cross-origin `<img>` load is an ordinary AMBIENT browser request — every cookie matching the
   * target host rides along, and any `Set-Cookie` the response carries is stored back just as
   * ambiently. Confirmed live, real case: a broken/orphaned image asset's own unrelated `401`
   * response silently overwrote an unrelated app's own session cookie on the same host (cookies
   * are never port-scoped), logging the viewer out mid-page. `'anonymous'` forces a real CORS-mode
   * fetch with NO credentials in either direction — this origin's own cookies are never sent, and
   * nothing in the response can ever be stored as one — while leaving a genuinely public image
   * load itself unaffected. Omitted by default: only a consumer whose own `src` host has this
   * exact hazard needs to opt in. */
  crossOrigin?: 'anonymous' | 'use-credentials'
  /** This component's own sizing (`display: inline-block`, `width`/`height`) lives in a
   * self-rendered `<style nonce={nonce}>` element, never an inline `style` attribute — required
   * only when the consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own
   * zero-config default is exactly this shape); without a matching nonce, a strict CSP blocks that
   * `<style>` element, leaving this component at the browser's own default inline-box sizing (a
   * real fallback, never a crash) until a matching nonce is supplied. Omit `nonce` entirely when no
   * such CSP is in effect — nothing here changes. */
  nonce?: string
}
