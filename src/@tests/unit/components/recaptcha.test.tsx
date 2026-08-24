import './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Recaptcha } from 'components/Recaptcha/index.ts'

function mount(element: ReturnType<typeof Recaptcha>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    root: container.firstElementChild as HTMLElement,
    unmount: () => act(() => root.unmount()),
  }
}

// `happy-dom`'s own default settings (see `dom-test-setup.ts`) disable real JavaScript file
// loading — every injected `<script>` auto-fires its OWN synchronous `error` event before this
// file's code ever runs. Dispatching a real `load` event here overrides that (the `load` listener
// always wins, regardless of what fired before it), simulating the provider's script resolving
// successfully so `useScriptLoader`'s status flips to `'ready'` and the widget-render effect runs.
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
      // v3's own `execute(siteKey, { action })` resolves a token as a Promise.
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

Deno.test('Recaptcha: SSR markup is an inert, empty container — no window/document read', () => {
  const html = renderToStaticMarkup(<Recaptcha siteKey='site-key' onVerify={() => {}} />)

  assertStringIncludes(html, 'data-space-ui="recaptcha"')
  assertEquals(html.includes('<script'), false)
})

Deno.test('Recaptcha: id/className land on the single root container', () => {
  const html = renderToStaticMarkup(
    <Recaptcha siteKey='site-key' onVerify={() => {}} id='my-captcha' className='big' />,
  )

  assertStringIncludes(html, 'id="my-captcha"')
  assertStringIncludes(html, 'class="big"')
})

Deno.test('Recaptcha: mounting with no grecaptcha global yet never throws', () => {
  const { root, unmount } = mount(<Recaptcha siteKey='site-key' onVerify={() => {}} />)

  assertEquals(root.getAttribute('data-space-ui'), 'recaptcha')
  unmount()
})

// --- widget render + onVerify ------------------------------------------------------------------

Deno.test('Recaptcha: renders the v2 widget once ready, onVerify fires from callback', async () => {
  const mock = installGrecaptchaMock()
  const onVerify: string[] = []
  const { unmount } = mount(
    <Recaptcha siteKey='site-key' onVerify={(token) => onVerify.push(token)} />,
  )
  // Real `<script>` injection + `grecaptcha.ready` both resolve inside a `useEffect` — flush it.
  await act(() => Promise.resolve())
  act(() => forceScriptReady('recaptcha/api.js'))

  assertEquals(mock.renderCalls.length, 1)
  mock.triggerCallback('real-token')
  assertEquals(onVerify, ['real-token'])

  unmount()
  mock.restore()
})

Deno.test("Recaptcha: onExpire fires from the widget's own expired-callback", async () => {
  const mock = installGrecaptchaMock()
  let expiredCount = 0
  const { unmount } = mount(
    <Recaptcha siteKey='site-key' onVerify={() => {}} onExpire={() => expiredCount++} />,
  )
  await act(() => Promise.resolve())
  act(() => forceScriptReady('recaptcha/api.js'))

  mock.triggerExpired()
  assertEquals(expiredCount, 1)

  unmount()
  mock.restore()
})

Deno.test('Recaptcha: onError fires from the own error-callback, with a real Error', async () => {
  const mock = installGrecaptchaMock()
  const errors: unknown[] = []
  const { unmount } = mount(
    <Recaptcha siteKey='site-key' onVerify={() => {}} onError={(err) => errors.push(err)} />,
  )
  await act(() => Promise.resolve())
  act(() => forceScriptReady('recaptcha/api.js'))

  mock.triggerError()
  assertEquals(errors.length, 1)
  assertEquals(errors[0] instanceof Error, true)

  unmount()
  mock.restore()
})

// --- verifyTrigger --------------------------------------------------------------------------

Deno.test('Recaptcha: verifyTrigger calls execute(widgetId) for an invisible widget', async () => {
  const mock = installGrecaptchaMock()
  function Wrapper({ verifyTrigger }: { verifyTrigger: number }) {
    return (
      <Recaptcha
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
  act(() => forceScriptReady('recaptcha/api.js'))

  assertEquals(mock.executeCalls.length, 0)
  act(() => root.render(<Wrapper verifyTrigger={1} />))
  assertEquals(mock.executeCalls.length, 1)
  assertEquals(mock.executeCalls[0], [1]) // the widget id returned by the render mock

  act(() => root.unmount())
  mock.restore()
})

Deno.test(
  'Recaptcha: verifyTrigger while grecaptcha itself is unavailable never throws, never executes',
  async () => {
    const mock = installGrecaptchaMock()
    function Wrapper({ verifyTrigger }: { verifyTrigger: number }) {
      return (
        <Recaptcha
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
    act(() => forceScriptReady('recaptcha/api.js'))

    // Status is already `'ready'` (the widget rendered), but the global itself is now gone — e.g.
    // cleared by something else on the page. `getGrecaptcha()` returning `undefined` here is what
    // the guard defends against.
    const globals = globalThis as unknown as { grecaptcha?: unknown }
    const real = globals.grecaptcha
    globals.grecaptcha = undefined

    act(() => root.render(<Wrapper verifyTrigger={1} />))

    assertEquals(mock.executeCalls.length, 0)

    globals.grecaptcha = real
    act(() => root.unmount())
    mock.restore()
  },
)

Deno.test('Recaptcha: verifyTrigger with action (v3) calls execute(siteKey, options)', async () => {
  const mock = installGrecaptchaMock()
  const onVerify: string[] = []
  function Wrapper({ verifyTrigger }: { verifyTrigger: number }) {
    return (
      <Recaptcha
        siteKey='site-key'
        action='login'
        onVerify={(token) => onVerify.push(token)}
        verifyTrigger={verifyTrigger}
      />
    )
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Wrapper verifyTrigger={0} />))
  await act(() => Promise.resolve())
  act(() => forceScriptReady('recaptcha/api.js'))

  // v3 renders no widget at all.
  assertEquals(mock.renderCalls.length, 0)

  await act(async () => {
    root.render(<Wrapper verifyTrigger={1} />)
    await Promise.resolve()
  })

  assertEquals(mock.executeCalls.length, 1)
  assertEquals(mock.executeCalls[0], ['site-key', { action: 'login' }])
  assertEquals(onVerify, ['v3-token'])

  act(() => root.unmount())
  mock.restore()
})

// --- resetTrigger ----------------------------------------------------------------------------

Deno.test('Recaptcha: resetTrigger calls reset(widgetId)', async () => {
  const mock = installGrecaptchaMock()
  function Wrapper({ resetTrigger }: { resetTrigger: number }) {
    return <Recaptcha siteKey='site-key' onVerify={() => {}} resetTrigger={resetTrigger} />
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Wrapper resetTrigger={0} />))
  await act(() => Promise.resolve())
  act(() => forceScriptReady('recaptcha/api.js'))

  assertEquals(mock.resetCalls.length, 0)
  act(() => root.render(<Wrapper resetTrigger={1} />))
  assertEquals(mock.resetCalls.length, 1)
  assertEquals(mock.resetCalls[0], [1])

  act(() => root.unmount())
  mock.restore()
})

Deno.test('Recaptcha: resetTrigger is a no-op in v3 mode', async () => {
  const mock = installGrecaptchaMock()
  function Wrapper({ resetTrigger }: { resetTrigger: number }) {
    return (
      <Recaptcha
        siteKey='site-key'
        action='login'
        onVerify={() => {}}
        resetTrigger={resetTrigger}
      />
    )
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Wrapper resetTrigger={0} />))
  await act(() => Promise.resolve())

  act(() => root.render(<Wrapper resetTrigger={1} />))
  assertEquals(mock.resetCalls.length, 0)

  act(() => root.unmount())
  mock.restore()
})

// --- script-load failure (network or CSP block) -----------------------------------------------

Deno.test('Recaptcha: a script load failure also routes to onError', async () => {
  const errors: unknown[] = []
  const { unmount } = mount(
    <Recaptcha siteKey='site-key' onVerify={() => {}} onError={(err) => errors.push(err)} />,
  )
  await act(() => Promise.resolve())

  const script = document.head.querySelector(
    'script[src*="recaptcha/api.js"]',
  ) as HTMLScriptElement
  act(() => script.dispatchEvent(new Event('error')))

  assertEquals(errors.length, 1)
  assertStringIncludes(String(errors[0]), 'reCAPTCHA')
  assertStringIncludes(String(errors[0]), 'script-src')
  assertStringIncludes(String(errors[0]), 'frame-src')

  unmount()
})

// --- scriptSrc override -----------------------------------------------------------------------

Deno.test('Recaptcha: scriptSrc overrides the default script URL verbatim', () => {
  const customSrc = 'https://proxy.example.com/recaptcha-mirror.js'
  const { unmount } = mount(
    <Recaptcha siteKey='site-key' onVerify={() => {}} scriptSrc={customSrc} />,
  )

  const scripts = Array.from(document.head.querySelectorAll(`script[src="${customSrc}"]`))
  // Exactly one — the custom URL is injected (and deduped) the same way the default one is.
  assertEquals(scripts.length, 1)

  unmount()
})
