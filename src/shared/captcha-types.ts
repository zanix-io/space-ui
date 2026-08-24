/**
 * Shared, renderer-agnostic literal-union types for the captcha widgets (`Recaptcha`, `HCaptcha`,
 * `Turnstile`) — pure type aliases, no logic. The same "genuinely shared by more than one
 * component" bar `close-on-outside.ts`/`positioning.ts` were already held to before being
 * extracted, applied here to a shared TYPE rather than shared runtime code. Exported publicly
 * (`mod.ts`/`mod-preact.ts`, same module in both) because each is already reachable from a public
 * component prop (`RecaptchaProps.size`/`HCaptchaProps.size`/`TurnstileProps.appearance`) — JSR's
 * own doc-lint requires every type reachable from a public export to itself be public, the same
 * rule `Placement`/`Side` (`positioning.ts`) and `DrawerSide` (`Drawer/types.ts`) already satisfy.
 */

/**
 * The v2-style widget rendering mode `Recaptcha`/`HCaptcha` both share: a visible checkbox
 * (`'normal'`, the common default, or `'compact'`) or an invisible widget (`'invisible'`) driven
 * entirely by the component's own `verifyTrigger`. `Turnstile` has no equivalent — see
 * {@linkcode TurnstileAppearance} for its own, differently-shaped real API option.
 */
export type CaptchaWidgetSize = 'normal' | 'compact' | 'invisible'

/**
 * Turnstile's own real widget-mode option, passed straight through to `turnstile.render` —
 * `'always'`/`'interaction-only'` run on render (Turnstile decides on its own whether an
 * interactive challenge is needed); `'execute'` renders no widget UI at all and produces a token
 * only once the component's own `verifyTrigger` changes. Named after Turnstile's own real option,
 * not {@linkcode CaptchaWidgetSize}'s `size` shape — Turnstile has no checkbox/invisible concept of
 * its own to name a `size` after.
 */
export type TurnstileAppearance = 'always' | 'execute' | 'interaction-only'
