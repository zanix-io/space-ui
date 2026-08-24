import './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { HCaptcha } from 'components/HCaptcha/index.ts'

function mount(element: ReturnType<typeof HCaptcha>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    root: container.firstElementChild as HTMLElement,
    unmount: () => act(() => root.unmount()),
  }
}

// `happy-dom`'s own default settings disable real JavaScript file loading — every injected
// `<script>` auto-fires its own synchronous `error` event first. A manually-dispatched `load`
// always wins over that, simulating the provider's script resolving — see
// `recaptcha.test.tsx`'s own `forceScriptReady` doc for the full reasoning, shared verbatim here.
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

// --- SSR / before hydration ------------------------------------------------------------------

Deno.test('HCaptcha: SSR markup is an inert, empty container — no window/document read', () => {
  const html = renderToStaticMarkup(<HCaptcha siteKey='site-key' onVerify={() => {}} />)

  assertStringIncludes(html, 'data-space-ui="hcaptcha"')
  assertEquals(html.includes('<script'), false)
})

Deno.test('HCaptcha: mounting with no hcaptcha global yet never throws', () => {
  const { root, unmount } = mount(<HCaptcha siteKey='site-key' onVerify={() => {}} />)

  assertEquals(root.getAttribute('data-space-ui'), 'hcaptcha')
  unmount()
})

// --- widget render + onVerify ------------------------------------------------------------------

Deno.test('HCaptcha: renders the checkbox widget once ready, and onVerify fires', async () => {
  const mock = installHcaptchaMock()
  const onVerify: string[] = []
  const { unmount } = mount(
    <HCaptcha siteKey='site-key' onVerify={(token) => onVerify.push(token)} />,
  )
  await act(() => Promise.resolve())
  act(() => forceScriptReady('js.hcaptcha.com'))

  assertEquals(mock.renderCalls.length, 1)
  mock.triggerCallback('real-token')
  assertEquals(onVerify, ['real-token'])

  unmount()
  mock.restore()
})

Deno.test("HCaptcha: onExpire/onError fire from the widget's own callbacks", async () => {
  const mock = installHcaptchaMock()
  let expiredCount = 0
  const errors: unknown[] = []
  const { unmount } = mount(
    <HCaptcha
      siteKey='site-key'
      onVerify={() => {}}
      onExpire={() => expiredCount++}
      onError={(err) => errors.push(err)}
    />,
  )
  await act(() => Promise.resolve())
  act(() => forceScriptReady('js.hcaptcha.com'))

  mock.triggerExpired()
  assertEquals(expiredCount, 1)

  mock.triggerError('rate-limited')
  assertEquals(errors, ['rate-limited'])

  unmount()
  mock.restore()
})

// --- verifyTrigger --------------------------------------------------------------------------

Deno.test('HCaptcha: verifyTrigger calls execute(widgetId) for an invisible widget', async () => {
  const mock = installHcaptchaMock()
  function Wrapper({ verifyTrigger }: { verifyTrigger: number }) {
    return (
      <HCaptcha
        siteKey='site-key'
        size='invisible'
        onVerify={() => {}}
        verifyTrigger={verifyTrigger}
      />
    )
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Wrapper verifyTrigger={0} />))
  await act(() => Promise.resolve())
  act(() => forceScriptReady('js.hcaptcha.com'))

  assertEquals(mock.executeCalls.length, 0)
  act(() => root.render(<Wrapper verifyTrigger={1} />))
  assertEquals(mock.executeCalls.length, 1)
  assertEquals(mock.executeCalls[0], ['1'])

  act(() => root.unmount())
  mock.restore()
})

// --- resetTrigger ----------------------------------------------------------------------------

Deno.test('HCaptcha: resetTrigger calls reset(widgetId)', async () => {
  const mock = installHcaptchaMock()
  function Wrapper({ resetTrigger }: { resetTrigger: number }) {
    return <HCaptcha siteKey='site-key' onVerify={() => {}} resetTrigger={resetTrigger} />
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Wrapper resetTrigger={0} />))
  await act(() => Promise.resolve())
  act(() => forceScriptReady('js.hcaptcha.com'))

  assertEquals(mock.resetCalls.length, 0)
  act(() => root.render(<Wrapper resetTrigger={1} />))
  assertEquals(mock.resetCalls.length, 1)
  assertEquals(mock.resetCalls[0], ['1'])

  act(() => root.unmount())
  mock.restore()
})

// --- script-load failure (network or CSP block) -----------------------------------------------

Deno.test('HCaptcha: a script load failure also routes to onError', async () => {
  const errors: unknown[] = []
  const { unmount } = mount(
    <HCaptcha siteKey='site-key' onVerify={() => {}} onError={(err) => errors.push(err)} />,
  )
  await act(() => Promise.resolve())

  const script = document.head.querySelector('script[src*="js.hcaptcha.com"]') as HTMLScriptElement
  act(() => script.dispatchEvent(new Event('error')))

  assertEquals(errors.length >= 1, true)
  const last = String(errors[errors.length - 1])
  assertStringIncludes(last, 'hCaptcha')
  assertStringIncludes(last, 'script-src')
  assertStringIncludes(last, 'frame-src')

  unmount()
})

// --- scriptSrc override -----------------------------------------------------------------------

Deno.test('HCaptcha: scriptSrc overrides the default script URL verbatim', () => {
  const customSrc = 'https://proxy.example.com/hcaptcha-mirror.js'
  const { unmount } = mount(
    <HCaptcha siteKey='site-key' onVerify={() => {}} scriptSrc={customSrc} />,
  )

  const scripts = Array.from(document.head.querySelectorAll(`script[src="${customSrc}"]`))
  assertEquals(scripts.length, 1)

  unmount()
})
