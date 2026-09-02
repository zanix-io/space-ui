import './dom-test-setup.ts'
import { assertEquals, assertStringIncludes } from '@std/assert'
import {
  buildOverlayCss,
  getOrInsertDynamicRule,
  removeDynamicRule,
} from 'shared/overlay-position-css.ts'

Deno.test('buildOverlayCss: a base-only call (no variant) emits exactly one rule', () => {
  const css = buildOverlayCss('modal-backdrop', { position: 'fixed', inset: 0, zIndex: 999 })

  assertEquals(css, "[data-space-ui='modal-backdrop']{position:fixed;inset:0;z-index:999}")
})

Deno.test('buildOverlayCss: camelCase property names convert to kebab-case in the output', () => {
  const css = buildOverlayCss('toast-stack', { flexDirection: 'column' })

  assertStringIncludes(css, 'flex-direction:column')
  assertEquals(css.includes('flexDirection'), false)
})

Deno.test('buildOverlayCss: a variant emits one rule per key, keyed off the given attribute', () => {
  const css = buildOverlayCss('drawer', { position: 'fixed', zIndex: 1000 }, {
    attr: 'data-side',
    values: {
      left: { top: '0', left: '0', bottom: '0' },
      right: { top: '0', right: '0', bottom: '0' },
    },
  })

  assertStringIncludes(css, "[data-space-ui='drawer']{position:fixed;z-index:1000}")
  assertStringIncludes(css, "[data-space-ui='drawer'][data-side='left']{top:0;left:0;bottom:0}")
  assertStringIncludes(css, "[data-space-ui='drawer'][data-side='right']{top:0;right:0;bottom:0}")
})

Deno.test('buildOverlayCss: rule order is base rule first, then variants in the given order', () => {
  const css = buildOverlayCss('modal', { position: 'fixed', zIndex: 1000 }, {
    attr: 'data-position',
    values: {
      center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'top-left': { top: '1rem', left: '1rem' },
    },
  })

  const baseIndex = css.indexOf("[data-space-ui='modal']{")
  const centerIndex = css.indexOf("[data-space-ui='modal'][data-position='center']")
  const topLeftIndex = css.indexOf("[data-space-ui='modal'][data-position='top-left']")

  assertEquals(baseIndex < centerIndex, true)
  assertEquals(centerIndex < topLeftIndex, true)
})

Deno.test('buildOverlayCss: no variant given never emits a variant-attribute selector', () => {
  const css = buildOverlayCss('tooltip', { position: 'fixed', top: 0, left: 0 })

  assertEquals(css.includes('['), true) // the base [data-space-ui='...'] selector itself
  assertEquals(/\[data-space-ui='tooltip'\]\[data-/.test(css), false)
})

// --- getOrInsertDynamicRule / removeDynamicRule -----------------------------------------------

function mountedStyleEl(cssText: string): HTMLStyleElement {
  const styleEl = document.createElement('style')
  styleEl.textContent = cssText
  document.body.appendChild(styleEl)
  return styleEl
}

Deno.test('getOrInsertDynamicRule: inserts a rule with the given selector, empty by default', () => {
  const styleEl = mountedStyleEl("[data-space-ui='tooltip']{position:fixed}")
  const ruleRef: { current: CSSStyleRule | null } = { current: null }

  const rule = getOrInsertDynamicRule(
    styleEl,
    ruleRef,
    "[data-space-ui='tooltip'][data-tooltip-id='abc']",
  )

  assertEquals(rule, ruleRef.current)
  assertEquals(rule?.selectorText, "[data-space-ui='tooltip'][data-tooltip-id='abc']")
  assertEquals(rule?.style.cssText, '')
  assertEquals(styleEl.sheet?.cssRules.length, 2)

  styleEl.remove()
})

Deno.test('getOrInsertDynamicRule: a second call with a populated ruleRef never re-inserts', () => {
  const styleEl = mountedStyleEl("[data-space-ui='tooltip']{position:fixed}")
  const ruleRef: { current: CSSStyleRule | null } = { current: null }

  const first = getOrInsertDynamicRule(
    styleEl,
    ruleRef,
    "[data-space-ui='tooltip'][data-tooltip-id='abc']",
  )
  first?.style.setProperty('transform', 'translate(1px, 2px)')
  const second = getOrInsertDynamicRule(
    styleEl,
    ruleRef,
    "[data-space-ui='tooltip'][data-tooltip-id='abc']",
  )

  assertEquals(second, first)
  // The property set on the first call survived — proof this was the SAME rule, not a fresh insert
  // that would have started with an empty `style` again.
  assertEquals(second?.style.transform, 'translate(1px, 2px)')
  assertEquals(styleEl.sheet?.cssRules.length, 2)

  styleEl.remove()
})

Deno.test('getOrInsertDynamicRule: returns null when the style element has no sheet (disconnected)', () => {
  const styleEl = document.createElement('style') // never appended — never connected
  const ruleRef: { current: CSSStyleRule | null } = { current: null }

  const rule = getOrInsertDynamicRule(styleEl, ruleRef, "[data-space-ui='tooltip']")

  assertEquals(rule, null)
  assertEquals(ruleRef.current, null)
})

Deno.test('removeDynamicRule: deletes the rule from a still-connected sheet and clears ruleRef', () => {
  const styleEl = mountedStyleEl("[data-space-ui='tooltip']{position:fixed}")
  const ruleRef: { current: CSSStyleRule | null } = { current: null }
  getOrInsertDynamicRule(styleEl, ruleRef, "[data-space-ui='tooltip'][data-tooltip-id='abc']")
  assertEquals(styleEl.sheet?.cssRules.length, 2)

  removeDynamicRule(styleEl, ruleRef)

  assertEquals(ruleRef.current, null)
  assertEquals(styleEl.sheet?.cssRules.length, 1) // only the original static rule remains

  styleEl.remove()
})

// A real, confirmed bug caught by a "repeated open/close cycles never accumulate duplicate rules"
// component test while building this (see `Popover`'s own test file): `HTMLStyleElement.sheet`
// legitimately returns `null` once its element is disconnected (spec behavior) — an earlier version
// of this function returned early in that case WITHOUT clearing `ruleRef`, leaving a stale reference
// that made the NEXT `getOrInsertDynamicRule` call wrongly skip inserting a fresh rule into a new
// element's own new stylesheet. `ruleRef.current` must be cleared regardless of whether the sheet
// lookup itself succeeds.
Deno.test('removeDynamicRule: still clears ruleRef even when the style element is already disconnected', () => {
  const styleEl = mountedStyleEl("[data-space-ui='tooltip']{position:fixed}")
  const ruleRef: { current: CSSStyleRule | null } = { current: null }
  getOrInsertDynamicRule(styleEl, ruleRef, "[data-space-ui='tooltip'][data-tooltip-id='abc']")
  assertEquals(ruleRef.current !== null, true)

  styleEl.remove() // disconnects it — `styleEl.sheet` now returns null

  removeDynamicRule(styleEl, ruleRef)

  assertEquals(ruleRef.current, null)
})

Deno.test('removeDynamicRule: a no-op, never throwing, when there is nothing to remove', () => {
  const ruleRef: { current: CSSStyleRule | null } = { current: null }

  removeDynamicRule(null, ruleRef)
  removeDynamicRule(document.createElement('style'), ruleRef)

  assertEquals(ruleRef.current, null)
})
