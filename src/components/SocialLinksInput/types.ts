export type { SocialNetworkName } from './detect-social-network.ts'
import type { SocialNetworkName } from './detect-social-network.ts'

/** One row in {@linkcode SocialLinksInputBaseProps.values}. */
export type SocialLinkEntry = {
  /** A stable key for list rendering/removal — generated client-side by this component's own "+"
   * button, never user-facing. A caller supplying its own initial `values`/`defaultValues` (e.g.
   * loaded from a saved profile) provides its own `id` per entry — any stable, unique string works,
   * this component never inspects its shape. */
  id: string
  url: string
  /** Auto-detected from `url`'s own hostname (see `detectSocialNetwork`'s own doc for the exact
   * rules) — recomputed on every `url` change. `null` only for an empty or unparseable `url`. */
  network: SocialNetworkName | null
}

/** What a real `<form method="post">` submission actually needs per entry — `network` is never a
 * submitted field, since it's a derived, client-side-only display convenience recomputed from
 * `url` on every change (a value the server can just as easily derive again itself, if it ever
 * needs to, rather than trusting a client-supplied copy of it). */
export type SocialLinkEntryPayload = { url: string }

/** Props for {@linkcode SocialLinksInput}, shared by both the React and Preact bindings. */
export type SocialLinksInputBaseProps = {
  /** Controlled entries — when given, this component's own internal state is never the source of
   * truth; the caller must update this prop (typically from `onValuesChange`) for the displayed
   * list to actually change. Always wins over `defaultValues` when both are given — ignored, not
   * invalid, same contract established throughout this component family
   * (`Input.value`/`RadioGroup.value`). */
  values?: SocialLinkEntry[]
  /** Initial entries — seeds the first render only, ignored once `values` is given.
   * @default [] */
  defaultValues?: SocialLinkEntry[]
  onValuesChange?: (values: SocialLinkEntry[]) => void
  /** An optional cap on the total number of entries — once reached, the "+" button is disabled
   * (not removed, so the limit stays visible) rather than hidden. */
  max?: number
  /** Shown on every row's own empty URL field, e.g. `'https://instagram.com/you'`. */
  placeholder?: string
  /** The field-name PREFIX a plain `<form method="post">` submission uses for this list — see
   * `index.ts`'s own doc, "Real HTML form integration", for the full contract. With no `name`, no
   * row's URL field carries a `name` attribute at all, the same "opt-in only" contract
   * `Input`/`FileInput`'s own `name` already have. */
  name?: string
  /** Accessible name for the "+" button.
   * @default 'Add another social link' */
  addButtonLabel?: string
  id?: string
  className?: string
}
