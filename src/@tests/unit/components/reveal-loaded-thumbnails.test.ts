import './dom-test-setup.ts'
import { assertEquals } from '@std/assert'
import { revealLoadedThumbnails } from 'shared/reveal-loaded-thumbnails.ts'

// `dom-test-setup.ts` bridges the document and the element classes only; the observer is needed
// for the watching half of `revealLoadedThumbnails`.
// deno-lint-ignore no-explicit-any
const globals = globalThis as any
// deno-lint-ignore no-explicit-any
globals.MutationObserver = (globals.window as any).MutationObserver

const PENDING = '<span data-space-ui="skeleton"></span>'

/** A pending thumbnail as the server renders it. `complete`/`naturalWidth` are what a browser would
 * report for the `<img>`; happy-dom never loads one, so the test states them. */
function thumbnail(
  { complete, naturalWidth }: { complete: boolean; naturalWidth: number },
): HTMLElement {
  const root = document.createElement('span')
  root.setAttribute('data-space-ui', 'thumbnail')
  root.setAttribute('data-pending', 'true')
  root.innerHTML = `<img src="https://cdn.example.com/a.jpg">${PENDING}`
  const image = root.querySelector('img') as HTMLImageElement
  Object.defineProperty(image, 'complete', { value: complete, configurable: true })
  Object.defineProperty(image, 'naturalWidth', { value: naturalWidth, configurable: true })
  document.body.appendChild(root)
  return root
}

function isRevealed(root: HTMLElement): boolean {
  return root.getAttribute('data-loaded') === 'true' && !root.hasAttribute('data-pending') &&
    root.querySelector('[data-space-ui="skeleton"]') === null
}

function isStillPending(root: HTMLElement): boolean {
  return !root.hasAttribute('data-loaded') && root.getAttribute('data-pending') === 'true' &&
    root.querySelector('[data-space-ui="skeleton"]') !== null
}

function reset() {
  document.body.innerHTML = ''
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

Deno.test('revealLoadedThumbnails: an image already loaded is revealed and its skeleton removed', () => {
  reset()
  const root = thumbnail({ complete: true, naturalWidth: 480 })
  const stop = revealLoadedThumbnails()

  assertEquals(isRevealed(root), true)

  stop()
  reset()
})

Deno.test('revealLoadedThumbnails: a broken image (complete, no intrinsic size) stays pending', () => {
  reset()
  const root = thumbnail({ complete: true, naturalWidth: 0 })
  const stop = revealLoadedThumbnails()

  assertEquals(isStillPending(root), true)

  stop()
  reset()
})

Deno.test('revealLoadedThumbnails: an image still loading stays pending until its load event', () => {
  reset()
  const root = thumbnail({ complete: false, naturalWidth: 0 })
  const stop = revealLoadedThumbnails()
  assertEquals(isStillPending(root), true)

  const image = root.querySelector('img') as HTMLImageElement
  Object.defineProperty(image, 'complete', { value: true, configurable: true })
  Object.defineProperty(image, 'naturalWidth', { value: 480, configurable: true })
  image.dispatchEvent(new Event('load'))

  assertEquals(isRevealed(root), true)

  stop()
  reset()
})

Deno.test('revealLoadedThumbnails: a load event for a broken image reveals nothing', () => {
  reset()
  const root = thumbnail({ complete: false, naturalWidth: 0 })
  const stop = revealLoadedThumbnails()

  const image = root.querySelector('img') as HTMLImageElement
  Object.defineProperty(image, 'complete', { value: true, configurable: true })
  image.dispatchEvent(new Event('load'))

  assertEquals(isStillPending(root), true)

  stop()
  reset()
})

Deno.test('revealLoadedThumbnails: a thumbnail inserted later is revealed', async () => {
  reset()
  const stop = revealLoadedThumbnails()

  const root = thumbnail({ complete: true, naturalWidth: 480 })
  await tick()

  assertEquals(isRevealed(root), true)

  stop()
  reset()
})

Deno.test('revealLoadedThumbnails: a thumbnail nested in an inserted subtree is revealed', async () => {
  reset()
  const stop = revealLoadedThumbnails()

  const wrapper = document.createElement('section')
  document.body.appendChild(wrapper)
  await tick()
  const root = thumbnail({ complete: true, naturalWidth: 480 })
  wrapper.appendChild(root)
  await tick()

  assertEquals(isRevealed(root), true)

  stop()
  reset()
})

Deno.test('revealLoadedThumbnails: the returned function stops the watching', async () => {
  reset()
  const stop = revealLoadedThumbnails()
  stop()

  const root = thumbnail({ complete: true, naturalWidth: 480 })
  await tick()

  assertEquals(isStillPending(root), true)

  reset()
})

Deno.test('revealLoadedThumbnails: leaves an already-loaded thumbnail and other images alone', () => {
  reset()
  const loaded = document.createElement('span')
  loaded.setAttribute('data-space-ui', 'thumbnail')
  loaded.setAttribute('data-loaded', 'true')
  loaded.innerHTML = '<img src="https://cdn.example.com/b.jpg">'
  document.body.appendChild(loaded)
  const plain = document.createElement('div')
  plain.setAttribute('data-pending', 'true')
  plain.innerHTML = `<img src="https://cdn.example.com/c.jpg">${PENDING}`
  document.body.appendChild(plain)
  const stop = revealLoadedThumbnails()

  assertEquals(loaded.getAttribute('data-loaded'), 'true')
  assertEquals(plain.getAttribute('data-pending'), 'true')
  assertEquals(plain.querySelector('[data-space-ui="skeleton"]') !== null, true)

  stop()
  reset()
})
