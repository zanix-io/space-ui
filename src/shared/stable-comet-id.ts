/**
 * Derives a deterministic, DOM-`id`-safe string from `seed` (`menu-submenu-3a11f0c2`) — for
 * `Menu`'s own internal id needs (`submenuId`/`listId`, each `aria-controls` link) that must match
 * EXACTLY between the server render and the client hydration, in a component that is
 * architecturally required to stay dependency-free from `@zanix/space` (see `Menu/index.ts`'s own
 * "Zero `@zanix/space` dependency, by construction" doc) — so it can never import that package's
 * own `useCometStableId` (`@zanix/space/comet/react`/`/preact`), the general fix for this same class
 * of bug in a component that CAN take that dependency (`NavDrawer/render.ts`'s own `panelId`).
 *
 * `useId()` cannot do this job here: it guarantees stable, matching ids only WITHIN one hydration
 * root, counting sequentially from wherever that root's own render starts. `Menu` can end up
 * composed inside a ready-made Comet's own isolated hydration root (`NavDrawer` composes it
 * directly) — so the server's full-document render assigns it whatever ordinal position it happens
 * to land on among EVERY `useId()` call on the whole page, while the client's isolated hydration
 * starts that counter fresh at zero for just that one boundary. The two can never coincide by
 * construction, producing a real (if usually silent-until-a-later-re-render) hydration mismatch —
 * confirmed live against `NavDrawer`'s own composed `Menu` submenu `aria-controls`.
 * Deriving the id purely from `seed` — a value already identical on both sides, since it's just a
 * prop — sidesteps the whole "which hydration root, which position" question entirely, and stays
 * correct regardless of whether `Menu` ends up nested in a Comet at all (unlike a Context-based
 * scope, which only protects a component while nested inside a Comet that actually provides one).
 *
 * FNV-1a (32-bit, 8 lowercase hex digits) — the same small, fast, non-cryptographic hash
 * `@zanix/space`'s own `hashSourceKey` (`comet-manifest.ts`) already uses for the identical
 * "deterministic id from an arbitrary string, safe to put in public HTML" need. Not a security
 * hash: collision resistance against an adversarial `seed` isn't the goal, only a stable value for
 * the same seed across renders — two sibling items (or two `Menu`s) sharing the exact same
 * `label`/`url` are a known, narrow residual (they'd collide on id), not a practical concern for
 * the overwhelmingly common case of distinct labels/urls.
 *
 * @param seed - A value already identical between the server render and the client hydration
 * (typically a required prop, like `NavDrawer`'s own `label`) — never anything derived from render
 * order, a counter, or `Math.random()`/`crypto.randomUUID()`, each of which reintroduces the exact
 * SSR/hydration mismatch this function exists to avoid.
 * @param prefix - Prepended to the hash, purely for readability in devtools (`'nav-drawer'` →
 * `'nav-drawer-3a11f0c2'`) — never part of the uniqueness guarantee itself.
 */
export function deriveStableCometId(seed: string, prefix: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
