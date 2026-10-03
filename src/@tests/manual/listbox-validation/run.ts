/**
 * Real-browser check that `validationMessage` is held back while a listbox shows suggestions and is
 * applied again, in time, when it closes. It drives the installed Google Chrome with trusted input
 * events (a real mouse press is `mousedown`, `focusout`, `mouseup`, `click`, in the browser's own
 * order), through the shipped `Combobox` and `MultiSelect` of both bindings.
 *
 * ```sh
 * deno run -A src/@tests/manual/listbox-validation/run.ts           # drive Chrome, print results
 * deno run -A src/@tests/manual/listbox-validation/run.ts --serve   # serve the fixture, print a URL
 * ```
 *
 * It needs no dependency beyond Deno and Chrome: the fixture is bundled with `deno bundle`, and
 * Chrome is driven over the DevTools protocol with Deno's own `WebSocket`. Headless Chrome draws no
 * validation bubble, so what it proves is the state the bubble is made from: `validity.customError`
 * at each event, and whether the form's submit is blocked. `--serve` opens the same pages in a
 * normal Chrome, where the bubble itself can be looked at. It runs neither under `deno test` nor in
 * CI.
 *
 * @module
 */
// deno-lint-ignore-file deno-zanix-plugin/no-znx-console no-await-in-loop

const CHROME = Deno.env.get('CHROME_PATH') ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT = new URL('../../../../', import.meta.url).pathname
const FIXTURE = 'src/@tests/manual/listbox-validation'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function bundle(directory: string): Promise<void> {
  for (const binding of ['react', 'preact']) {
    const { code, stderr } = await new Deno.Command(Deno.execPath(), {
      args: [
        'bundle',
        '--platform',
        'browser',
        '-o',
        `${directory}/${binding}.js`,
        `${FIXTURE}/fixture-${binding}.ts`,
      ],
      cwd: ROOT,
      stdout: 'null',
      stderr: 'piped',
    }).output()
    if (code !== 0) throw new Error(new TextDecoder().decode(stderr))
  }
}

function serve(directory: string): Deno.HttpServer<Deno.NetAddr> {
  return Deno.serve({ port: 0, onListen: () => {} }, async (request) => {
    const url = new URL(request.url)
    if (url.pathname === '/') {
      const binding = url.searchParams.get('binding') === 'preact' ? 'preact' : 'react'
      return new Response(
        `<!doctype html><meta charset=utf-8><title>listbox validation (${binding})</title>` +
          `<body style="font:16px sans-serif;margin:2rem"><p>${binding}: type in a field, then ` +
          `click Save with the suggestions open.</p><div id=root></div>` +
          `<style>#elsewhere{margin-top:24rem;display:block}</style>` +
          `<script type=module src=/${binding}.js></script>`,
        { headers: { 'content-type': 'text/html' } },
      )
    }
    if (url.pathname === '/react.js' || url.pathname === '/preact.js') {
      return new Response(await Deno.readFile(`${directory}${url.pathname}`), {
        headers: { 'content-type': 'text/javascript' },
      })
    }
    return new Response('not found', { status: 404 })
  })
}

/** The part of the DevTools protocol this script uses. */
class Page {
  #socket: WebSocket
  #next = 1
  #pending = new Map<number, (value: { result?: unknown; error?: { message: string } }) => void>()

  private constructor(socket: WebSocket) {
    this.#socket = socket
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.#pending.get(message.id)?.(message)
      this.#pending.delete(message.id)
    }
  }

  public static async connect(url: string): Promise<Page> {
    const socket = new WebSocket(url)
    await new Promise((resolve, reject) => {
      socket.onopen = resolve
      socket.onerror = reject
    })
    return new Page(socket)
  }

  public async send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.#next++
    const reply = new Promise<{ result?: unknown; error?: { message: string } }>((resolve) =>
      this.#pending.set(id, resolve)
    )
    this.#socket.send(JSON.stringify({ id, method, params }))
    const message = await reply
    if (message.error) throw new Error(`${method}: ${message.error.message}`)
    return message.result
  }

  public async js<T>(expression: string): Promise<T> {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }) as { result: { value: T }; exceptionDetails?: { text: string } }
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }

  /** A real mouse press and release at the centre of `selector`. */
  public async click(selector: string): Promise<void> {
    const point = await this.js<{ x: number; y: number }>(
      `(() => { const r = document.querySelector(${
        JSON.stringify(selector)
      }).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`,
    )
    const base = { x: point.x, y: point.y, button: 'left', clickCount: 1 }
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base })
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base })
  }

  public async type(text: string): Promise<void> {
    await this.send('Input.insertText', { text })
  }

  public async key(key: 'Escape' | 'Enter'): Promise<void> {
    const code = key === 'Escape' ? 27 : 13
    const base = { key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code }
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      ...base,
      ...(key === 'Enter' ? { text: '\r' } : {}),
    })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  }

  public close(): void {
    this.#socket.close()
  }
}

type State = {
  customError: boolean
  expanded: boolean
  options: number
  formValid: boolean
  active: string
  value: string
}

async function launchChrome(): Promise<{ page: Page; stop: () => Promise<void> }> {
  const directory = await Deno.makeTempDir({ prefix: 'listbox-validation-chrome-' })
  const port = 9300 + Math.floor(Math.random() * 500)
  const chrome = new Deno.Command(CHROME, {
    args: [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${directory}`,
      // A page Chrome treats as hidden has its animation frames throttled, and Preact runs its
      // effects after one: these keep the page in the foreground, as it is for a person.
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    stdout: 'null',
    stderr: 'null',
  }).spawn()
  let target: { webSocketDebuggerUrl: string } | undefined
  for (let attempt = 0; attempt < 50 && !target; attempt++) {
    await sleep(200)
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      target = list.find((entry: { type: string }) => entry.type === 'page')
    } catch {
      // Chrome is still starting.
    }
  }
  if (!target) throw new Error('Chrome did not start')
  const page = await Page.connect(target.webSocketDebuggerUrl)
  return {
    page,
    stop: async () => {
      page.close()
      chrome.kill()
      await chrome.status
      await Deno.remove(directory, { recursive: true }).catch(() => {})
    },
  }
}

const failures: string[] = []
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (${detail})`}`)
  if (!ok) failures.push(name)
}

async function stateOf(page: Page, prefix: string): Promise<State> {
  return await page.js<State>(`(() => {
    const input = document.getElementById('${prefix}-input')
    const form = document.getElementById('${prefix}-form')
    return {
      customError: input.validity.customError,
      expanded: input.getAttribute('aria-expanded') === 'true',
      options: document.querySelectorAll('#${prefix}-form ~ * [role=option], [role=option]').length,
      formValid: form.checkValidity(),
      active: document.activeElement && document.activeElement.id || document.activeElement.tagName,
      value: input.value,
    }
  })()`)
}

const log = (page: Page) => page.js<string[]>('window.__log.slice()')
const clearLog = (page: Page) => page.js('window.__log.length = 0')

async function openWithSuggestions(page: Page, prefix: string): Promise<void> {
  await page.js(`document.getElementById('${prefix}-input').blur()`)
  await page.js(`(() => { const i = document.getElementById('${prefix}-input'); i.focus(); })()`)
  await page.click(`#${prefix}-input`)
  if (prefix === 'combobox') {
    // Typing replaces the selected text, as it does for a person.
    await page.js(`document.getElementById('combobox-input').select()`)
    await page.type('a')
  }
  await sleep(250)
}

async function scenarios(page: Page, binding: string, prefix: string): Promise<void> {
  console.log(`\n${binding} / ${prefix}`)
  await page.send('Page.navigate', { url: `${baseUrl}/?binding=${binding}` })
  await sleep(700)
  await page.js(`document.getElementById('${prefix}-input').blur()`)

  // Combobox starts with no text and so no message; give it a text that matches nothing.
  if (prefix === 'combobox') {
    await page.click('#combobox-input')
    await page.js(`document.getElementById('combobox-input').select()`)
    await page.type('zz')
    await sleep(250)
    await page.js(`document.getElementById('elsewhere').focus()`)
    await sleep(250)
  }
  const idle = await stateOf(page, prefix)
  check('the message is applied while the field is idle', idle.customError, JSON.stringify(idle))

  await openWithSuggestions(page, prefix)
  const open = await stateOf(page, prefix)
  check(
    'with the suggestions showing the input is not invalid (the bubble would cover them)',
    open.expanded && open.options > 0 && !open.customError && open.formValid,
    JSON.stringify(open),
  )

  // A click on Save with the suggestions open: the input loses focus, the listbox closes, then the
  // click validates the form.
  await clearLog(page)
  await page.click(`#${prefix}-submit`)
  await sleep(300)
  const events = await log(page)
  const clickAt = events.findIndex((entry) => entry.startsWith('click on'))
  check(
    'a click on Save with the suggestions open does not submit the form',
    !events.some((entry) => entry.startsWith('submit')) &&
      events.some((entry) => entry.startsWith('invalid')),
    events.join(' | '),
  )
  check(
    'the message was already applied when the click ran',
    clickAt >= 0 && events[clickAt].endsWith('customError=true'),
    events.join(' | '),
  )
  const afterBlocked = await stateOf(page, prefix)
  console.log(`  note  after the blocked submit: ${JSON.stringify(afterBlocked)}`)
  await sleep(1000)
  const later = await stateOf(page, prefix)
  console.log(`  note  one second later:        ${JSON.stringify(later)}`)

  for (const closer of ['Escape', 'outside click'] as const) {
    await page.js(`document.getElementById('elsewhere').focus()`)
    await openWithSuggestions(page, prefix)
    const before = await stateOf(page, prefix)
    if (closer === 'Escape') await page.key('Escape')
    else await page.click('#elsewhere')
    await sleep(250)
    const after = await stateOf(page, prefix)
    check(
      `${closer} closes the listbox and applies the message again`,
      before.expanded && !before.customError && !after.expanded && after.customError,
      `${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
    )
  }

  await page.js(`document.getElementById('elsewhere').focus()`)
  await openWithSuggestions(page, prefix)
  await clearLog(page)
  await page.key('Enter')
  await sleep(300)
  const enterEvents = await log(page)
  check(
    'an Enter with nothing highlighted does not submit an invalid form',
    !enterEvents.some((entry) => entry.startsWith('submit')),
    enterEvents.join(' | '),
  )
}

let baseUrl = ''

async function main(): Promise<void> {
  const directory = await Deno.makeTempDir({ prefix: 'listbox-validation-' })
  await bundle(directory)
  const server = serve(directory)
  baseUrl = `http://127.0.0.1:${server.addr.port}`

  if (Deno.args.includes('--serve')) {
    console.log(`React:  ${baseUrl}/?binding=react\nPreact: ${baseUrl}/?binding=preact`)
    console.log(
      'Open it in Chrome, type in a field and click Save with the suggestions open. Ctrl+C stops.',
    )
    await new Promise(() => {})
  }

  const { page, stop } = await launchChrome()
  try {
    for (const binding of ['react', 'preact']) {
      for (const prefix of ['combobox', 'multiselect']) await scenarios(page, binding, prefix)
    }
  } finally {
    await stop()
    await server.shutdown()
    await Deno.remove(directory, { recursive: true }).catch(() => {})
  }
  console.log(failures.length === 0 ? '\nAll checks passed.' : `\n${failures.length} failed.`)
  Deno.exit(failures.length === 0 ? 0 : 1)
}

await main()
