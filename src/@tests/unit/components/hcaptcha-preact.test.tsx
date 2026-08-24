import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { HCaptcha } from 'components/HCaptcha/index.preact.ts'

function element(props: Parameters<typeof HCaptcha>[0]): VNode {
  return h(HCaptcha, props) as VNode
}

function mount(props: Parameters<typeof HCaptcha>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    root: container.firstElementChild as HTMLElement,
    rerender: (next: Parameters<typeof HCaptcha>[0]) =>
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
  'error-callback'?: (err?: unknown) => void
}

function installHcaptchaMock() {
  const renderCalls: unknown[] = []
  const executeCalls: unknown[] = []
  const resetCalls: unknown[] = []
  let nextWidgetId = 1
  let lastParams: MockRenderParams | null = null

  const globals = globalThis as unknown as { hcaptcha?: unknown }
  const previous = globals.hcaptcha

  globals.hcaptcha = {
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
    triggerError: (err?: unknown) => lastParams?.['error-callback']?.(err),
    restore: () => {
      globals.hcaptcha = previous
    },
  }
}

Deno.test('HCaptcha (preact): SSR markup is an inert, empty container', () => {
  const html = renderToString(element({ siteKey: 'site-key', onVerify: () => {} }))

  assertStringIncludes(html, 'data-space-ui="hcaptcha"')
  assertEquals(html.includes('<script'), false)
})

Deno.test('HCaptcha (preact): renders the checkbox widget once ready, and onVerify fires', () => {
  const mock = installHcaptchaMock()
  const onVerify: string[] = []
  const { unmount } = mount({ siteKey: 'site-key', onVerify: (token) => onVerify.push(token) })
  act(() => forceScriptReady('js.hcaptcha.com'))

  assertEquals(mock.renderCalls.length, 1)
  act(() => mock.triggerCallback('real-token'))
  assertEquals(onVerify, ['real-token'])

  unmount()
  mock.restore()
})

Deno.test("HCaptcha (preact): onExpire/onError fire from the widget's own callbacks", () => {
  const mock = installHcaptchaMock()
  let expiredCount = 0
  const errors: unknown[] = []
  const { unmount } = mount({
    siteKey: 'site-key',
    onVerify: () => {},
    onExpire: () => expiredCount++,
    onError: (err) => errors.push(err),
  })
  act(() => forceScriptReady('js.hcaptcha.com'))

  act(() => mock.triggerExpired())
  assertEquals(expiredCount, 1)

  act(() => mock.triggerError('rate-limited'))
  assertEquals(errors, ['rate-limited'])

  unmount()
  mock.restore()
})

Deno.test('HCaptcha (preact): verifyTrigger calls execute for an invisible widget', () => {
  const mock = installHcaptchaMock()
  const { rerender, unmount } = mount({
    siteKey: 'site-key',
    size: 'invisible',
    onVerify: () => {},
    verifyTrigger: 0,
  })
  act(() => forceScriptReady('js.hcaptcha.com'))

  assertEquals(mock.executeCalls.length, 0)
  rerender({ siteKey: 'site-key', size: 'invisible', onVerify: () => {}, verifyTrigger: 1 })
  assertEquals(mock.executeCalls.length, 1)

  unmount()
  mock.restore()
})

Deno.test('HCaptcha (preact): resetTrigger calls reset(widgetId)', () => {
  const mock = installHcaptchaMock()
  const { rerender, unmount } = mount({ siteKey: 'site-key', onVerify: () => {}, resetTrigger: 0 })
  act(() => forceScriptReady('js.hcaptcha.com'))

  assertEquals(mock.resetCalls.length, 0)
  rerender({ siteKey: 'site-key', onVerify: () => {}, resetTrigger: 1 })
  assertEquals(mock.resetCalls.length, 1)

  unmount()
  mock.restore()
})

Deno.test('HCaptcha (preact): a script load failure routes to onError with a CSP hint', () => {
  const errors: unknown[] = []
  const { unmount } = mount({
    siteKey: 'site-key',
    onVerify: () => {},
    onError: (err) => errors.push(err),
  })

  const script = document.head.querySelector('script[src*="js.hcaptcha.com"]') as HTMLScriptElement
  act(() => {
    script.dispatchEvent(new Event('error'))
  })

  assertEquals(errors.length >= 1, true)
  const last = String(errors[errors.length - 1])
  assertStringIncludes(last, 'hCaptcha')
  assertStringIncludes(last, 'script-src')
  assertStringIncludes(last, 'frame-src')

  unmount()
})

Deno.test('HCaptcha (preact): scriptSrc overrides the default script URL verbatim', () => {
  const customSrc = 'https://proxy.example.com/hcaptcha-mirror-preact.js'
  const { unmount } = mount({ siteKey: 'site-key', onVerify: () => {}, scriptSrc: customSrc })

  const scripts = Array.from(document.head.querySelectorAll(`script[src="${customSrc}"]`))
  assertEquals(scripts.length, 1)

  unmount()
})
