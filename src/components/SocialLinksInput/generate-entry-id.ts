/**
 * A stable-enough-for-list-rendering, never-user-facing id for a new {@linkcode SocialLinkEntry} —
 * called exactly once, inside the "+" button's own click handler, never during render. That timing
 * is what keeps this safe despite using `crypto.randomUUID()` (a value this package's own
 * `shared/stable-comet-id.ts` explicitly avoids for anything rendered during SSR, since it would
 * differ between the server render and the client hydration): a NEW entry only ever exists because
 * of a real client-side click, so it has no server-rendered counterpart to mismatch against —
 * unlike an id derived from render order or a prop, which both sides must agree on independently.
 *
 * Falls back to a counter-plus-timestamp scheme when `crypto.randomUUID` isn't available (a
 * non-secure-context browser embedding, or an older runtime) — still unique enough for this
 * component's own purpose (a React/Preact list `key` and a removal target), never a security or
 * uniqueness-across-processes guarantee.
 */
export function generateEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  fallbackCounter += 1
  return `social-link-${Date.now()}-${fallbackCounter}`
}

let fallbackCounter = 0
