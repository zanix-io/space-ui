/**
 * `Video` — one of `@zanix/space-ui`'s components with a REAL runtime dependency on
 * `@zanix/space` (`resolveAssetHref`, from `@zanix/space/assets-manifest`, resolved directly by
 * `Video/render.ts`) — its own, single-component subpath, never the default (`.`) barrel, and
 * never a shared `./runtime` barrel either.
 *
 * ## Why a per-component subpath, not one shared `./runtime` barrel
 *
 * Until this change, `Video`/`Image`/`RichText`/`ImgButton`/`Card`/`NavDrawer` all shared ONE
 * `./runtime` entrypoint (`src/runtime.ts`). That fixed the original problem (`@zanix/space`
 * leaking into `.`/`./preact` — see "Why these components needed a separate entrypoint" below) but
 * introduced a NARROWER version of the exact same barrel-forces-resolution mechanism, one level
 * in: a barrel export forces resolution of every module it re-exports together, so `import {
 * NavDrawer } from '@zanix/space-ui/runtime' resolved `runtime.ts` as the physical module — which
 * ALSO statically re-exported `RichText`/`Video`/`Image`/`ImgButton`/`Card` in that same file,
 * pulling `RichText`'s own `markdown-to-jsx`/`@zanix/helpers` chain (and everything else those five
 * reach) into `NavDrawer`'s real build graph, even though `NavDrawer`'s own module never imports
 * any of them. Confirmed empirically (`deno info --json src/runtime.ts`): all 8 of `RichText`'s
 * own files were present in the resolved graph, despite a consumer only ever naming `NavDrawer`.
 *
 * Each of those six got its OWN subpath (`./runtime/video`, `./runtime/image`,
 * `./runtime/rich-text`, `./runtime/img-button`, `./runtime/card`, `./runtime/nav-drawer` — a
 * `/preact` variant alongside each) — importing any ONE never statically or dynamically reaches
 * any OTHER one's own files, UNLESS it genuinely composes it (`RichText` composing `Image`'s and
 * `Video`'s shared `render.ts`, real intentional coupling, not a barrel accident — see each file's
 * own doc for exactly what it reaches and why). `ImgButton` and `Card` have since moved OUT of
 * `./runtime` entirely — each got its own `visual` render-prop (the same fix `Menu` already got,
 * see "`Menu`/`ImgButton`/`Card`, zero `@zanix/space` dependency" below) and now ships from the
 * default `.`/`./preact` barrel instead, leaving `Video`/`Image`/`RichText`/`NavDrawer` as the only
 * remaining `./runtime/*` subpaths.
 *
 * **The combined `./runtime` convenience barrel is REMOVED entirely, not kept as an opt-in
 * trade-off.** The same precedent `@zanix/utils` already set for its own root-barrel cut applies
 * here: a barrel whose entire justification was convenience, once proven to actively cause a
 * real, confirmed circular-resolution-class bug, isn't worth keeping as an "opt in if you accept
 * the trade-off" — a consumer would need to already know which components they use share zero
 * real composition before trusting a combined import again, which defeats the barrel's own point.
 * This is a BREAKING change — see the CHANGELOG's own `[Unreleased]` entry for the import-path
 * migration table.
 *
 * ## Why these components needed a separate entrypoint from `.`/`./preact` in the first place
 *
 * `mod.ts`/`mod-preact.ts` (the package's `.`/`./preact` entrypoints) export the majority of this
 * package's components and have ZERO runtime dependency on `@zanix/space`. `Video`, `Image`, and
 * `RichText` each have a genuine, direct-or-composed runtime dependency on `@zanix/space`'s own
 * `resolveAssetHref`; `NavDrawer` reaches `@zanix/space` a different way (a real `'use comet'`
 * boundary importing `defineComet` from `@zanix/space/comet` directly — see `nav-drawer.ts`'s own
 * doc). Keeping any of them inside `mod.ts`/`mod-preact.ts` would force resolution of
 * `@zanix/space` the moment a consumer imports even ONE unrelated component from there (e.g.
 * `Button`, which has zero `@zanix/space` dependency) — and since `@zanix/space`'s own build
 * pipeline is what resolves a `@zanix/space-ui` import when building a `@zanix/space` app that
 * uses this package, that's a genuine circular resolution: `@zanix/space`'s own build tooling
 * ending up needing to resolve `@zanix/space` itself, one repo away. Confirmed to hang
 * `@deno/loader`'s native workspace resolution in a real `zanix space build`.
 *
 * ## `Menu`/`ImgButton`/`Card`, zero `@zanix/space` dependency
 *
 * `Menu` composes only `Link`/`Button`/`Icon` (never `Image`/`ImgButton`) via its own `visual`
 * render-prop. `ImgButton`/`Card` originally composed `Image`'s own `render.ts` directly for their
 * `image` prop — the same static-import-always-hoisted problem `Menu` had — until each replaced it
 * with its own `visual` render-prop (`ImgButton/render.ts`'s `ImgButtonRenderProps.visual`,
 * `Card/render.ts`'s `CardRenderProps.visual`): the caller supplies an already-built element
 * instead of a data shape either component resolves itself. All three have zero `@zanix/space`
 * dependency as a result, so all three ship from the root barrel instead (see
 * `components/Menu/index.ts`'s, `components/ImgButton/index.ts`'s, and `components/Card/index.ts`'s
 * own docs).
 *
 * ## The rule for any FUTURE component with a real `@zanix/space` dependency
 *
 * Give it its OWN subpath here too (`./runtime/<kebab-name>`, a `/preact` variant alongside) —
 * never add it to an existing component's subpath file, and never reintroduce a shared combined
 * barrel. `src/@tests/unit/intl/dependency-boundary.test.ts`'s own table-driven suite is what keeps
 * this invariant checked automatically going forward — add a new row there, not just a doc mention
 * here.
 *
 * ## Two bindings, same name, additive — `Video` also ships from the root barrel now
 *
 * `Video/render.ts`'s own `createVideo` took an unconditional `@zanix/space/assets-manifest`
 * import until this change; `resolveAssetHref` is now an OPTIONAL, injected parameter instead (see
 * that file's own module doc), so `components/Video/index.ts`/`index.preact.ts` (the root barrel,
 * `.`/`./preact`) can call `createVideo(h)` with none — comet-safe, correct for any already-
 * absolute file/poster/track path and for the YouTube/Vimeo/generic-iframe cases (`@zanix/space/
 * video-source` stays a real, unconditional dependency of `Video/render.ts` regardless — it's not
 * `'server-only'`, so it never blocks a Comet build), but a relative local asset path is left
 * unresolved there. THIS file does the other half: it constructs `Video` directly (unlike every
 * other file in this module, which merely re-exports each component's own `index.ts`), injecting
 * `resolveAssetHref` itself — the ONLY place in this package's own `Video`-related files that
 * imports it — so a relative path keeps auto-resolving exactly as this component always has.
 * Byte-for-byte identical behavior to every prior version of this component; SSR-only, never
 * comet-safe. Purely additive: nothing here is renamed or removed, and this subpath's own contract
 * for an existing consumer is unchanged.
 *
 * @module
 */

import { createElement } from 'react'
import type { ReactElement } from 'react'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import type { CreateElement } from 'typings/renderer.ts'
import { createVideo } from 'components/Video/render.ts'
import type { VideoProps } from 'components/Video/types.ts'

export type { VideoProps, VideoSourceProps, VideoTrackProps } from 'components/Video/types.ts'

export const Video: (props: VideoProps) => ReactElement | null = createVideo(
  createElement as unknown as CreateElement<ReactElement>,
  resolveAssetHref,
)
