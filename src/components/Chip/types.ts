/**
 * Props for {@linkcode Chip}. See `render.ts`'s own doc for the full behavioral contract.
 */
export type ChipBaseProps = {
  /** The visible pill text — also this component's own accessible content (a plain text node,
   * never interpreted as markup, same "already-resolved data as props" principle every other
   * component here follows). */
  label: string
  /**
   * A generic tone/category hook, rendered verbatim as `data-tone` — deliberately an OPEN
   * `string`, never a closed enum of specific accent names. This package ships no CSS and owns no
   * color identity of its own (see `docs/styling.md`) — a fixed union baked into this type would
   * either invent generic-sounding categories with no real backing, or hardcode ONE consuming
   * app's own semantic vocabulary into a shared library's public API, which is exactly the kind of
   * brand-specific leak this package's own architecture forbids. A consumer defines whatever tone
   * vocabulary its own design system needs (e.g. `'primary'`, or a domain-specific accent name) and
   * styles it entirely in its own stylesheet via `[data-space-ui='chip'][data-tone='...']` — this
   * component neither ships nor assumes any particular mapping from a tone value to a real color.
   * @default 'neutral'
   */
  tone?: string
  /** Presence alone decides the mode: given, this chip renders a real, keyboard-operable remove
   * button and calls this when it's activated; omitted, this is a purely informational, static
   * chip with no interactive control at all — same "a callback prop's presence implies the
   * feature" idiom already used throughout this package (e.g. `Input.onValueChange`), rather than a
   * separate `removable` boolean that could disagree with whether a handler was actually given. */
  onRemove?: () => void
  /** Accessible label for the remove button. Defaults to `` `Remove ${label}` `` — same convention
   * `MultiSelect`'s own chip remove control already establishes — override for a localized
   * consumer. Ignored when {@linkcode onRemove} is omitted. */
  removeLabel?: string
  id?: string
  className?: string
}
