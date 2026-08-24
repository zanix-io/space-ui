import { resolveAssetHref } from '@zanix/space/assets-manifest'

/** Options for {@linkcode resolveRichTextDocument}. */
export type ResolveRichTextDocumentOptions = {
  /**
   * Resolves a root-relative asset path (`resolveAssetHref`'s own fallback shape,
   * `/assets/docs/terms.md`) against a real origin before `fetch`ing it — required server-side,
   * where (unlike a browser) there's no implicit page origin a bare root-relative path resolves
   * against. A `@zanix/space` `loader` already has its own request's origin available; pass it
   * through here. Omit entirely for a browser/client call, where a root-relative path already
   * resolves correctly on its own.
   */
  baseUrl?: string | URL
}

/**
 * Resolves `source` (an absolute URL, or a relative asset path in the same sense
 * `Video`'s/`Image`'s own `src` already is) to its real text content — the clean replacement for
 * legacy RichText's own `doc` prop, kept as a real capability rather than dropped, but moved
 * OUTSIDE `RichText` itself entirely (see `RichText/index.ts`'s own doc for the full architectural
 * reasoning). A standalone, renderer-agnostic async function, not a component or a hook —
 * mirrors `StructuredData`'s own `resolve.ts` precedent exactly: a component and an adjacent pure
 * resolver a consumer can call independently of the component at all, e.g. from a `loader`.
 *
 * Always `fetch`-based, never `readFileSync` — legacy's own `doc` loading used Node's synchronous,
 * server-only `fs.readFileSync` for the non-fetched branch, a real, confirmed bug (would throw in
 * any browser/edge runtime bundle). This works identically in any environment with `fetch`
 * (browser, Deno, edge, Node 18+).
 *
 * A failed load REJECTS — legacy's own version had no error handling at all, silently rendering a
 * fetched error page's own HTML as if it were rich-text content. The caller (typically a `loader`,
 * which `@zanix/space` already has real, established error-handling conventions for) decides what
 * a failed doc load means for its own page, the same way it already decides that for its own
 * `loader` failures — this function doesn't invent a second, RichText-specific error channel.
 *
 * Called from a `loader`, the resolved content arrives at `RichText` already resolved, server-side,
 * before the page ever renders — deterministic first render by construction, never the client-only
 * fetch state that caused legacy's own acknowledged, unresolved hydration-mismatch bug. A caller
 * free to call this from their own client-side effect instead owns
 * that loading-state/placeholder decision explicitly and visibly, the same as any other async data
 * a component in this package might depend on — nothing here hides that it's happening.
 *
 * @example
 * ```ts
 * // Inside a `@zanix/space` page's own loader:
 * const content = await resolveRichTextDocument('docs/terms.md', { baseUrl: request.url })
 * return { content }
 * ```
 */
export async function resolveRichTextDocument(
  source: string,
  options?: ResolveRichTextDocumentOptions,
): Promise<string> {
  const resolvedPath = isAbsoluteUrl(source) ? source : resolveAssetHref(source)
  const url = options?.baseUrl ? new URL(resolvedPath, options.baseUrl) : resolvedPath

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `resolveRichTextDocument: failed to load "${source}" (${response.status} ${response.statusText})`,
    )
  }

  return response.text()
}

/** Same distinction `Video/render.ts`'s own `resolveFileSrc` already draws, for the identical
 * reason: `resolveAssetHref` expects a bare relative path — handing it an already-absolute URL
 * would look it up in the manifest under that whole URL as a literal key and miss. */
function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
