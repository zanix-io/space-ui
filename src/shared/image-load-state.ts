/**
 * The renderer-agnostic result shape `use-image-load-state.ts`/`.preact.ts` both return — kept in
 * its own dependency-free module (no `react`/`preact` import of any kind) so a shared `render.ts`
 * body (`Avatar`, `Thumbnail`) can import this TYPE without ever reaching either per-renderer hook
 * file's own real code dependency, the same split `positioning.ts` (pure result shape) and
 * `use-position.ts`/`.preact.ts` (the per-renderer hook consuming it) already establish. Importing
 * `ImageLoadState` directly from `use-image-load-state.ts` instead — even as an `import type` —
 * would still pull that whole module (and its own real `react` code dependency) into the graph:
 * `deno info`'s own dependency listing is per-MODULE, not per-import-site, so a module reached only
 * through a `type`-only edge still reports every one of ITS OWN dependencies, code included. This
 * file existing at all is what keeps `Thumbnail`'s and `Avatar`'s own root-barrel bindings genuinely
 * comet-safe — confirmed by this package's own `dependency-boundary.test.ts`.
 */
export type ImageLoadState = {
  /** Confirmed broken, either via a real `error` event or a rejected `decode()`. */
  failed: boolean
  /** Confirmed decoded and ready, either via a real `load` event or a resolved `decode()`. `false`
   * for both `failed` and `loaded` means "still pending." */
  loaded: boolean
  /** Pass as the composed `Image`'s own `onLoad`. */
  onLoad: () => void
  /** Pass as the composed `Image`'s own `onError`. */
  onError: () => void
}
