import { createElement, useId, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createDisclosure } from './render.ts'
import type { DisclosureBaseProps } from './types.ts'

/** {@linkcode DisclosureBaseProps} plus the trigger and the collapsible content. */
export type DisclosureProps = DisclosureBaseProps & {
  /** Content of the trigger `<button>` this component renders — never a pre-built element of its
   * own. See this module's own doc ("Why `trigger` is content, not an element") for why. */
  trigger: ReactNode
  /** The collapsible content. */
  children: ReactNode
}

/**
 * The WAI-ARIA Disclosure (Show/Hide) pattern: a `<button aria-expanded aria-controls>` toggling a
 * region's visibility. Real implementation shared with the Preact binding via `render.ts`'s own
 * `createDisclosure` (see that file's own doc for how — hook injection); import from
 * `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered behavior. No
 * legacy equivalent — new, grounded in the
 * {@link https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ WAI-ARIA APG pattern} directly, and in
 * this package's own already-shipped `Menu` (which builds an identical trigger shape for its own
 * submenu disclosures — see `Menu/render.ts`'s own `MenuItemRow`, the "one control: both the
 * item's own visual and its disclosure trigger" branch).
 *
 * ## Why `trigger` is content, not an element
 *
 * A tempting, more "flexible"-looking API is `trigger: ReactNode` meaning a whole pre-built
 * element the caller renders (`<Disclosure trigger={<MyButton/>}>`) — rejected. This component
 * would then have to inject `aria-expanded`/`aria-controls`/`type="button"`/the click handler onto
 * an element it doesn't own, which only `cloneElement` can do, and fails silently for anything
 * that isn't a single cloneable element (a Fragment, a component that doesn't forward the props
 * `cloneElement` merges in, plain text). `Menu` already solved this exact problem for its own
 * disclosure triggers by never accepting a pre-built trigger element at all — it owns its own
 * `Button` and takes only the icon/label as data, composing them as that `Button`'s own `children`.
 * Same shape here: `Disclosure` owns its own `<button>`; `trigger` is that button's CONTENT (a
 * label, an icon+label combo, anything) — never the interactive element itself. Zero `cloneElement`
 * anywhere.
 *
 * ## Why `hidden`, not unmounting, when closed
 *
 * `Modal` renders `null` when closed — deliberately NOT copied here. `Modal`'s content is
 * inherently transient (nothing to index while a dialog is closed); a disclosure's content is
 * frequently exactly the opposite — an FAQ answer, help text, anything a search crawler reading raw
 * SSR HTML should still see even collapsed. Rendering `null` when closed would omit that content
 * from the very first response entirely, visible only after JS runs. The native `hidden` attribute
 * instead keeps the region present in the initial HTML (crawlable) while still correctly hidden
 * both visually (`display: none` by default) and from assistive tech (`[hidden]` is skipped by
 * every screen reader) — the accessibility guarantee this component actually needs, without the
 * SEO cost `Modal`'s own approach would have introduced here.
 *
 * ## Why not `<details>`/`<summary>`
 *
 * Evaluated seriously, not skipped: native `<details>` gives real/close/keyboard handling for free,
 * with zero JS, and would be the right choice for a simple, standalone, always-uncontrolled
 * disclosure. It's deliberately NOT used here because its own `toggle` event is not cancelable
 * (`Event.cancelable === false` per spec) — there is no way to build a reliably CONTROLLED
 * `<details>`, since the browser has already flipped its own internal state before any
 * React/Preact-level "correction" can run. This component exists specifically to be the
 * controllable foundation `Accordion` builds on (forcing "close this section because another one
 * opened" requires exactly that reliability) — `Menu` already made this same call for
 * its own, structurally identical disclosure triggers. A caller with no coordination need at all is
 * still better served by bare `<details>`/`<summary>`, no component needed.
 *
 * ## No `role="region"` by default
 *
 * The content region carries `aria-labelledby` (the ARIA relationship the pattern actually needs to
 * be correct) but deliberately no `role="region"` — `region` is a landmark role, and ARIA's own
 * guidance reserves it for content important enough that users would want to navigate to it
 * directly via a landmarks list. A page with many disclosures open at once (an FAQ list, `Accordion`
 * built on this component) would otherwise flood that landmark list with one entry per
 * section — real navigation noise, not a hypothetical one, and the reason several other headless UI
 * libraries make the same call for their own accordion/disclosure panels. No prop to opt back into
 * `role="region"` exists yet either — nothing has needed it; add one if a genuinely standalone,
 * landmark-worthy disclosure ever does.
 *
 * ## Deliberately hydrated, no no-JS fallback
 *
 * A direct consequence of rejecting `<details>` above: this component needs JS to be interactive at
 * all, same as `Modal`/`Menu`/`Slider` — none of which have a no-JS fallback either. Not an
 * oversight; the controlled-coordination requirement above is incompatible with a no-JS-usable
 * design.
 *
 * ## SSR/hydration
 *
 * `useId()` is still a hook — this isn't a fully hookless, `render.ts`-style pure function like
 * `Link`/`IFrame`/`Video` — but it's specifically the one designed to be deterministic and
 * SSR/hydration-safe: it doesn't depend on effects or on any client-only initial state, and
 * produces the identical id server- and client-side for the same component tree, so there's no
 * hydration-mismatch risk from using it here.
 *
 * ## `id`/`className` land on the outer wrapper, not the trigger or the content region
 *
 * Same "one root, one `id`/`className`" contract every other component in this package already has
 * (`Button`, `Link`, `Modal`, `Menu`...). The content region's own `id` (needed for
 * `aria-controls`) is generated internally via `useId()`, the same way `Menu`'s own `submenuId`
 * already is — not exposed as a prop, since nothing has ever needed to reference it from outside.
 */
export const Disclosure: (props: DisclosureProps) => ReactElement = createDisclosure<
  ReactElement,
  ReactNode
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useState },
)
