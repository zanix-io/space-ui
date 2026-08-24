import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Recaptcha } from 'components/Recaptcha/index.preact.ts'

// Same real hooks-usage reasoning `Counter/index.preact.ts`'s own test file already documents —
// this file builds a `Recaptcha` element with `h(Recaptcha, props)` and renders it via Preact's own
// render pass, instead of calling `Recaptcha(props)` as a plain function.
function element(props: Parameters<typeof Recaptcha>[0]): VNode {
  return h(Recaptcha, props) as VNode
}

function mount(props: Parameters<typeof Recaptcha>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    root: container.firstElementChild as HTMLElement,
    rerender: (next: Parameters<typeof Recaptcha>[0]) =>
      act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function forceScriptReady(srcSubstring: string) {
  const scripts = Array.from(document.head.querySelectorAll('script')) as HTMLScriptElement[]
  for (const script of scripts) {
    if (script.src.includes(srcSubstring)) script.dispatchEvent(new Event('load'))
  }
}

type MockRenderParams = {
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

function installGrecaptchaMock() {
  const renderCalls: unknown[] = []
  const executeCalls: unknown[] = []
  const resetCalls: unknown[] = []
  let nextWidgetId = 1
  let lastParams: MockRenderParams | null = null

  const globals = globalThis as unknown as { grecaptcha?: unknown }
  const previous = globals.grecaptcha

  globals.grecaptcha = {
    ready: (cb: () => void) => cb(),
    render: (_container: Element, params: MockRenderParams) => {
      renderCalls.push(params)
      lastParams = params
      return nextWidgetId++
    },
    execute: (...args: unknown[]) => {
      executeCalls.push(args)
      if (args.length === 2) return Promise.resolve('v3-token')
      return undefined
    },
    reset: (...args: unknown[]) => {
      resetCalls.push(args)
    },
  }

  return {
    renderCalls,
    executeCalls,
    resetCalls,
    triggerCallback: (token: string) => lastParams?.callback?.(token),
    triggerExpired: () => lastParams?.['expired-callback']?.(),
    triggerError: () => lastParams?.['error-callback']?.(),
    restore: () => {
      globals.grecaptcha = previous
    },
  }
}

// --- SSR / before hydration ------------------------------------------------------------------

Deno.test('Recaptcha (preact): SSR markup is an inert, empty container', () => {
  const html = renderToString(element({ siteKey: 'site-key', onVerify: () => {} }))

  assertStringIncludes(html, 'data-space-ui="recaptcha"')
  assertEquals(html.includes('<script'), false)
})

// --- widget render + onVerify ------------------------------------------------------------------

Deno.test('Recaptcha (preact): renders the v2 widget once ready, and onVerify fires', () => {
  const mock = installGrecaptchaMock()
  const onVerify: string[] = []
  const { unmount } = mount({ siteKey: 'site-key', onVerify: (token) => onVerify.push(token) })
  act(() => forceScriptReady('recaptcha/api.js'))

  assertEquals(mock.renderCalls.length, 1)
  act(() => mock.triggerCallback('real-token'))
  assertEquals(onVerify, ['real-token'])

  unmount()
  mock.restore()
})

Deno.test("Recaptcha (preact): onExpire/onError fire from the widget's own callbacks", () => {
  const mock = installGrecaptchaMock()
  let expiredCount = 0
  const errors: unknown[] = []
  const { unmount } = mount({
    siteKey: 'site-key',
    onVerify: () => {},
    onExpire: () => expiredCount++,
    onError: (err) => errors.push(err),
  })
  act(() => forceScriptReady('recaptcha/api.js'))

  act(() => mock.triggerExpired())
  assertEquals(expiredCount, 1)

  act(() => mock.triggerError())
  assertEquals(errors.length, 1)
  assertEquals(errors[0] instanceof Error, true)

  unmount()
  mock.restore()
})

// --- verifyTrigger / resetTrigger ---------------------------------------------------------------

Deno.test('Recaptcha (preact): verifyTrigger calls execute for an invisible widget', () => {
  const mock = installGrecaptchaMock()
  const { rerender, unmount } = mount({
    siteKey: 'site-key',
    size: 'invisible',
    onVerify: () => {},
    verifyTrigger: 0,
  })
  act(() => forceScriptReady('recaptcha/api.js'))

  assertEquals(mock.executeCalls.length, 0)
  rerender({ siteKey: 'site-key', size: 'invisible', onVerify: () => {}, verifyTrigger: 1 })
  assertEquals(mock.executeCalls.length, 1)

  unmount()
  mock.restore()
})

Deno.test('Recaptcha (preact): verifyTrigger with action (v3) calls execute(key, opts)', () => {
  const mock = installGrecaptchaMock()
  const onVerify: string[] = []
  const { rerender, unmount } = mount({
    siteKey: 'site-key',
    action: 'login',
    onVerify: (token) => onVerify.push(token),
    verifyTrigger: 0,
  })
  act(() => forceScriptReady('recaptcha/api.js'))

  assertEquals(mock.renderCalls.length, 0)
  rerender({
    siteKey: 'site-key',
    action: 'login',
    onVerify: (token) => onVerify.push(token),
    verifyTrigger: 1,
  })

  assertEquals(mock.executeCalls.length, 1)
  assertEquals(mock.executeCalls[0], ['site-key', { action: 'login' }])

  unmount()
  mock.restore()
})

Deno.test('Recaptcha (preact): resetTrigger calls reset(widgetId)', () => {
  const mock = installGrecaptchaMock()
  const { rerender, unmount } = mount({ siteKey: 'site-key', onVerify: () => {}, resetTrigger: 0 })
  act(() => forceScriptReady('recaptcha/api.js'))

  assertEquals(mock.resetCalls.length, 0)
  rerender({ siteKey: 'site-key', onVerify: () => {}, resetTrigger: 1 })
  assertEquals(mock.resetCalls.length, 1)

  unmount()
  mock.restore()
})

// --- script-load failure (network or CSP block) -----------------------------------------------

Deno.test('Recaptcha (preact): a script load failure routes to onError with a CSP hint', () => {
  const errors: unknown[] = []
  const { unmount } = mount({
    siteKey: 'site-key',
    onVerify: () => {},
    onError: (err) => errors.push(err),
  })

  const script = document.head.querySelector(
    'script[src*="recaptcha/api.js"]',
  ) as HTMLScriptElement
  act(() => {
    script.dispatchEvent(new Event('error'))
  })

  assertEquals(errors.length >= 1, true)
  assertStringIncludes(String(errors[errors.length - 1]), 'reCAPTCHA')
  assertStringIncludes(String(errors[errors.length - 1]), 'script-src')
  assertStringIncludes(String(errors[errors.length - 1]), 'frame-src')

  unmount()
})

Deno.test('Recaptcha (preact): scriptSrc overrides the default script URL verbatim', () => {
  const customSrc = 'https://proxy.example.com/recaptcha-mirror-preact.js'
  const { unmount } = mount({ siteKey: 'site-key', onVerify: () => {}, scriptSrc: customSrc })

  const scripts = Array.from(document.head.querySelectorAll(`script[src="${customSrc}"]`))
  assertEquals(scripts.length, 1)

  unmount()
})
