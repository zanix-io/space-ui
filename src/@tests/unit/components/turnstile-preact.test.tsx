import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Turnstile } from 'components/Turnstile/index.preact.ts'

function element(props: Parameters<typeof Turnstile>[0]): VNode {
  return h(Turnstile, props) as VNode
}

function mount(props: Parameters<typeof Turnstile>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    root: container.firstElementChild as HTMLElement,
    rerender: (next: Parameters<typeof Turnstile>[0]) =>
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
  'error-callback'?: (errorCode?: string) => void
}

function installTurnstileMock() {
  const renderCalls: unknown[] = []
  const executeCalls: unknown[] = []
  const resetCalls: unknown[] = []
  let nextWidgetId = 1
  let lastParams: MockRenderParams | null = null

  const globals = globalThis as unknown as { turnstile?: unknown }
  const previous = globals.turnstile

  globals.turnstile = {
    render: (_container: Element, params: MockRenderParams) => {
      renderCalls.push(params)
      lastParams = params
      return String(nextWidgetId++)
    },
    execute: (...args: unknown[]) => {
      executeCalls.push(args)
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
    triggerError: (errorCode?: string) => lastParams?.['error-callback']?.(errorCode),
    restore: () => {
      globals.turnstile = previous
    },
  }
}

Deno.test('Turnstile (preact): SSR markup is an inert, empty container', () => {
  const html = renderToString(element({ siteKey: 'site-key', onVerify: () => {} }))

  assertStringIncludes(html, 'data-space-ui="turnstile"')
  assertEquals(html.includes('<script'), false)
})

Deno.test('Turnstile (preact): renders the widget once ready, and onVerify fires', () => {
  const mock = installTurnstileMock()
  const onVerify: string[] = []
  const { unmount } = mount({ siteKey: 'site-key', onVerify: (token) => onVerify.push(token) })
  act(() => forceScriptReady('challenges.cloudflare.com'))

  assertEquals(mock.renderCalls.length, 1)
  act(() => mock.triggerCallback('real-token'))
  assertEquals(onVerify, ['real-token'])

  unmount()
  mock.restore()
})

Deno.test("Turnstile (preact): onExpire/onError fire from the widget's own callbacks", () => {
  const mock = installTurnstileMock()
  let expiredCount = 0
  const errors: unknown[] = []
  const { unmount } = mount({
    siteKey: 'site-key',
    onVerify: () => {},
    onExpire: () => expiredCount++,
    onError: (err) => errors.push(err),
  })
  act(() => forceScriptReady('challenges.cloudflare.com'))

  act(() => mock.triggerExpired())
  assertEquals(expiredCount, 1)

  act(() => mock.triggerError('110200'))
  assertEquals(errors, ['110200'])

  unmount()
  mock.restore()
})

Deno.test('Turnstile (preact): verifyTrigger calls execute in appearance="execute" mode', () => {
  const mock = installTurnstileMock()
  const { rerender, unmount } = mount({
    siteKey: 'site-key',
    appearance: 'execute',
    onVerify: () => {},
    verifyTrigger: 0,
  })
  act(() => forceScriptReady('challenges.cloudflare.com'))

  assertEquals(mock.executeCalls.length, 0)
  rerender({ siteKey: 'site-key', appearance: 'execute', onVerify: () => {}, verifyTrigger: 1 })
  assertEquals(mock.executeCalls.length, 1)

  unmount()
  mock.restore()
})

Deno.test('Turnstile (preact): resetTrigger calls reset(widgetId)', () => {
  const mock = installTurnstileMock()
  const { rerender, unmount } = mount({ siteKey: 'site-key', onVerify: () => {}, resetTrigger: 0 })
  act(() => forceScriptReady('challenges.cloudflare.com'))

  assertEquals(mock.resetCalls.length, 0)
  rerender({ siteKey: 'site-key', onVerify: () => {}, resetTrigger: 1 })
  assertEquals(mock.resetCalls.length, 1)

  unmount()
  mock.restore()
})

Deno.test('Turnstile (preact): a script load failure routes to onError with a CSP hint', () => {
  const errors: unknown[] = []
  const { unmount } = mount({
    siteKey: 'site-key',
    onVerify: () => {},
    onError: (err) => errors.push(err),
  })

  const script = document.head.querySelector(
    'script[src*="challenges.cloudflare.com"]',
  ) as HTMLScriptElement
  act(() => {
    script.dispatchEvent(new Event('error'))
  })

  assertEquals(errors.length >= 1, true)
  const last = String(errors[errors.length - 1])
  assertStringIncludes(last, 'Turnstile')
  assertStringIncludes(last, 'script-src')
  assertStringIncludes(last, 'frame-src')

  unmount()
})

Deno.test('Turnstile (preact): scriptSrc overrides the default script URL verbatim', () => {
  const customSrc = 'https://proxy.example.com/turnstile-mirror-preact.js'
  const { unmount } = mount({ siteKey: 'site-key', onVerify: () => {}, scriptSrc: customSrc })

  const scripts = Array.from(document.head.querySelectorAll(`script[src="${customSrc}"]`))
  assertEquals(scripts.length, 1)

  unmount()
})
