// Shared by `overlay-stack.test.ts` and every `Modal`/`Drawer` (React + Preact) test file that
// verifies the body-scroll lock `registerOverlay` (`shared/overlay-stack.ts`) applies — the lock
// itself is a `body{overflow:hidden}` CSSOM rule inside a shared `<style>` element, never
// `document.body.style.overflow` directly (a nonce-based CSP blocks that exactly like an inline
// `style` attribute — see that module's own doc), so a test verifies it the same way.

/** True for a `CSSStyleRule` that locks body scroll — checked via `selectorText`/`style.overflow`
 * rather than an exact `cssText` string match, since the engine's own serialization (spacing
 * around braces/colons) isn't part of this module's real contract. Exported for
 * `overlay-stack.test.ts`'s own additional `lockStyleElement` lookup (which element, not just
 * whether one exists) — every other consumer only ever needs {@linkcode bodyScrollLockRuleExists}. */
export function isBodyScrollLockRule(rule: CSSRule): boolean {
  const styleRule = rule as CSSStyleRule
  return styleRule.selectorText === 'body' && styleRule.style.overflow === 'hidden'
}

/** Whether ANY `<style>` element currently in `document.head` carries the body-scroll-lock rule —
 * the lock's real, observable effect, independent of which specific element instance holds it
 * (`overlay-stack.ts` lazily creates/reuses one, but a test shouldn't need to know its identity). */
export function bodyScrollLockRuleExists(): boolean {
  return Array.from(document.head.querySelectorAll('style')).some((el) =>
    Array.from(el.sheet?.cssRules ?? []).some(isBodyScrollLockRule)
  )
}
