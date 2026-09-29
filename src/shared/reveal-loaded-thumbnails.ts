/**
 * Shows the `Thumbnail` images the browser has already loaded, without waiting for the component to
 * hydrate. A server-rendered `Thumbnail` is always `data-pending`: its `<img>` is hidden and its
 * `Skeleton` is mounted until the client state flips to loaded, and that only happens once the
 * component hydrates and its `useImageLoadState` runs. An image the browser loaded from its cache
 * long before then stays hidden that whole time.
 *
 * `revealLoadedThumbnails` marks such a thumbnail loaded straight in the DOM: `data-loaded="true"`,
 * no `data-pending`, and the `Skeleton` removed. It only touches an `<img>` that finished loading
 * with an intrinsic size (`complete` and a non-zero `naturalWidth`), so a broken image keeps
 * hiding until the component confirms the failure and shows its fallback. Call it once, as early as
 * the page's client code can, before hydration starts; it also reveals a thumbnail whose image
 * finishes loading later and one that a client-side navigation inserts. The hydrated component then
 * reads the same state itself (`useImageLoadState` checks the image in a layout effect), so the two
 * never disagree for longer than one commit.
 *
 * Renderer-agnostic and free of any framework import: plain DOM, safe for either binding.
 *
 * @param scope The document to watch. Defaults to the global `document`.
 * @returns A function that stops the watching.
 */
export function revealLoadedThumbnails(scope: Document = document): () => void {
  reveal(scope)

  const onLoad = (event: Event) => {
    const target = event.target as Element | null
    if (target?.tagName !== 'IMG') return
    const root = target.closest(PENDING_THUMBNAIL)
    if (root) revealIfLoaded(root)
  }
  scope.addEventListener('load', onLoad, true)

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) reveal(node as Element)
      })
    }
  })
  observer.observe(scope, { childList: true, subtree: true })

  return () => {
    scope.removeEventListener('load', onLoad, true)
    observer.disconnect()
  }
}

const PENDING_THUMBNAIL = '[data-space-ui="thumbnail"][data-pending]'

function reveal(scope: Document | Element): void {
  if (scope.nodeType === 1 && (scope as Element).matches(PENDING_THUMBNAIL)) {
    revealIfLoaded(scope as Element)
  }
  scope.querySelectorAll(PENDING_THUMBNAIL).forEach(revealIfLoaded)
}

function revealIfLoaded(root: Element): void {
  const image = root.querySelector('img')
  if (!image || !image.complete || image.naturalWidth === 0) return
  root.setAttribute('data-loaded', 'true')
  root.removeAttribute('data-pending')
  root.querySelector('[data-space-ui="skeleton"]')?.remove()
}
