import { assert, assertEquals } from '@std/assert'
import { dirname, fromFileUrl } from '@std/path'

/**
 * Structural guard rails for this package's own renderer/export-surface boundaries — a single,
 * table-driven suite, not a bespoke test per component. Verified via `deno info --json`'s actual
 * resolved module graph — TRANSITIVE reachability, not a grep over `deno.jsonc`'s own `imports`
 * map, which would miss a package pulled in indirectly through some other dependency.
 *
 * Originally written for `intl`'s own `@formatjs/intl`/`markdown-to-jsx` boundaries, then extended
 * once, ad hoc, for `Menu` specifically. Generalized here into two tables covering EVERY component
 * exported from `mod.ts`/`mod-preact.ts` (the root barrel) and every subpath under `./runtime/*`
 * — adding a new component should mean adding one row to a table below, never writing a new
 * bespoke test. This is the real regression guard for the exact bug class this suite exists to
 * catch: a barrel file's own re-export statements create module-graph edges to EVERY re-exported
 * module, regardless of which single export a downstream consumer actually names. That's what let
 * `Menu` (which never touched `Image`) inherit `RichText`'s own chain when all six
 * `@zanix/space`-dependent components shared one `./runtime` barrel, and later what let `NavDrawer`
 * (which never touches `RichText`) inherit that same chain too — both fixed by splitting
 * `./runtime` into one subpath per component (see `src/runtime/video.ts`'s own `@module` doc). If
 * this suite had existed in its current, generalized form before either bug shipped, either would
 * have failed loudly the moment it was introduced.
 *
 * `code` vs `type` edges are checked separately throughout: a `type` edge is erased at compile
 * time and never bundled or evaluated (see `formatter.ts`'s own doc for why
 * `@formatjs/icu-messageformat-parser` is deliberately only ever a `type` edge here) — collapsing
 * the two into one check would make "reachable in a type position" indistinguishable from
 * "reachable at runtime", which is exactly the distinction this suite exists to keep honest.
 *
 * `Video`/`Image` are the first components to appear in BOTH tables at once — a real, reviewed
 * structural addition, not a drift: each now ships a comet-safe root-barrel binding (Table 1,
 * `ROOT_BARREL_COMPONENTS`, or a dedicated narrower test for `Video` specifically — see its own
 * doc below) alongside its existing `@zanix/space`-dependent `./runtime/*` binding (Table 2,
 * unchanged). Being in one table never implies absence from the other going forward.
 *
 * @module
 */

interface ModuleGraph {
  code: Set<string>
  type: Set<string>
}

// Memoized per entry — several assertions below (e.g. `RichText`'s `@zanix/space` footprint AND
// its `markdown-to-jsx`/`@zanix/utils` checks) resolve the SAME entry file more than once; spawning
// `deno info` again for an already-resolved entry would just be wasted process-spawn time.
const graphCache = new Map<string, Promise<ModuleGraph>>()

function moduleGraph(entry: string): Promise<ModuleGraph> {
  const cached = graphCache.get(entry)
  if (cached) return cached
  const promise = (async (): Promise<ModuleGraph> => {
    const command = new Deno.Command(Deno.execPath(), {
      args: ['info', '--json', entry],
      stdout: 'piped',
      stderr: 'piped',
    })
    const { stdout, stderr, success } = await command.output()
    if (!success) {
      throw new Error(`'deno info --json ${entry}' failed: ${new TextDecoder().decode(stderr)}`)
    }

    // deno-lint-ignore no-explicit-any -- `deno info --json`'s own output shape, not this package's.
    const parsed: any = JSON.parse(new TextDecoder().decode(stdout))
    const code = new Set<string>()
    const type = new Set<string>()
    for (const module of parsed.modules ?? []) {
      for (const dep of module.dependencies ?? []) {
        if (dep.code?.specifier) code.add(dep.code.specifier)
        if (dep.type?.specifier) type.add(dep.type.specifier)
      }
    }
    return { code, type }
  })()
  graphCache.set(entry, promise)
  return promise
}

/** Whether `pkg` (a bare npm package name, e.g. `'preact'` or `'preact/compat'`) is present among
 * `specifiers` — matches an exact package, a versioned form (`pkg@...`), or a subpath (`pkg/...`),
 * never a same-prefix package name like `react` incorrectly matching `react-dom`. */
function includesPackage(specifiers: Set<string>, pkg: string): boolean {
  return [...specifiers].some((specifier) => {
    if (!specifier.startsWith('npm:')) return false
    const rest = specifier.slice('npm:'.length).replace(/^\//, '')
    return rest === pkg || rest.startsWith(`${pkg}@`) || rest.startsWith(`${pkg}/`)
  })
}

/**
 * Walks up from `localPath` looking for the nearest ancestor `deno.json`/`deno.jsonc` that
 * declares a `"name"` field, and returns it — a cheap regex pull, not a full JSONC parse, since
 * `deno.jsonc` files in this ecosystem carry `//` comments `JSON.parse` would choke on and only
 * the `"name"` value is ever needed here. Returns `undefined` once the filesystem root is
 * reached with no such file found.
 */
async function nearestPackageName(localPath: string): Promise<string | undefined> {
  let dir = dirname(localPath)
  while (true) {
    for (const filename of ['deno.json', 'deno.jsonc']) {
      try {
        // Intentionally sequential: stop at the first ancestor directory that has either file,
        // never read every ancestor up to the filesystem root regardless of where the real
        // manifest sits.
        // deno-lint-ignore no-await-in-loop
        const text = await Deno.readTextFile(`${dir}/${filename}`)
        const match = text.match(/"name"\s*:\s*"([^"]+)"/)
        if (match) return match[1]
      } catch {
        // No such file at this level (or unreadable) — keep walking up.
      }
    }
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

/**
 * Whether `@zanix/space` (any subpath) is present among `specifiers` — the real regression test
 * for the circular-resolution bug `src/runtime/video.ts`'s own `@module` doc describes: `.`/
 * `./preact` (and every plain root-barrel component) must NEVER reach it, `./runtime/*` always
 * must. Matches the raw import-map form (`jsr:@zanix/space@...`), its fully resolved form
 * (`https://jsr.io/@zanix/space/...`, which also covers `@zanix/space`'s own internal files pulled
 * in transitively, e.g. `video-source.ts`'s own `content-type.ts`), AND the local `file://` form
 * Deno's own workspace auto-linking produces when this repo happens to be checked out inside a
 * Deno workspace that also has `@zanix/space` as a sibling member (see the
 * `deno-workspace-link-pitfalls` skill) — CI's plain sibling checkout never triggers this branch,
 * only a local monorepo checkout does. A `file://` match is confirmed via the resolved module's
 * own nearest `deno.json`'s `"name"`, never a path-text guess, so it never collides with
 * `@zanix/space-ui` (this package's own specifier) or an unrelated same-named local folder.
 */
async function includesZanixSpace(specifiers: Set<string>): Promise<boolean> {
  for (const specifier of specifiers) {
    if (/^jsr:@zanix\/space(@|\/|$)/.test(specifier)) return true
    if (/^https:\/\/jsr\.io\/@zanix\/space\//.test(specifier)) return true
    if (specifier.startsWith('file://')) {
      // Intentionally sequential: short-circuits on the first matching specifier instead of
      // resolving every candidate's package name up front.
      // deno-lint-ignore no-await-in-loop
      const name = await nearestPackageName(fromFileUrl(specifier))
      if (name === '@zanix/space') return true
    }
  }
  return false
}

/**
 * The exact `@zanix/space` SUBPATHS reachable directly from `specifiers` (`'assets-manifest'`,
 * `'video-source'`, `'comet'`, ...) — deliberately only ever reads the raw, unresolved `jsr:`
 * import-map specifier form this package's OWN source literally writes (`jsr:@zanix/space@^1.0.0/
 * assets-manifest`), never `@zanix/space`'s own internal file layout (`src/modules/assets/...`),
 * which is that package's own concern, not this test's, and would make this suite brittle against
 * an internal reorganization on their end that changes nothing about what THIS package imports.
 */
function zanixSpaceSubpaths(specifiers: Set<string>): Set<string> {
  const subpaths = new Set<string>()
  for (const specifier of specifiers) {
    const match = specifier.match(/^jsr:@zanix\/space@[^/]+\/(.+)$/)
    if (match) subpaths.add(match[1])
  }
  return subpaths
}

/** Whether `componentDir`'s own files (`src/components/<componentDir>/...`) appear anywhere in
 * `specifiers` — used to confirm a `./runtime/*` subpath's real, reviewed composition (expected)
 * never also drags in a SIBLING runtime component's own files (forbidden) — the exact
 * cross-contamination shape the old combined `./runtime` barrel produced. */
function includesComponentDir(specifiers: Set<string>, componentDir: string): boolean {
  const needle = `/components/${componentDir}/`
  return [...specifiers].some((specifier) => specifier.includes(needle))
}

/** Whether `@zanix/utils`'s own `workers/manager.ts` (the real `WorkerManager` class) is
 * reachable — the concrete, checkable signature of the known, tracked, NOT-fixed-here
 * `@zanix/utils`-side gap `RichText` still carries (see its own table row below and
 * `/tmp/utils-cron-logger-workerchain-comet-gap.md`, out of scope for this package). */
function includesUtilsWorkerChain(specifiers: Set<string>): boolean {
  return [...specifiers].some((specifier) => specifier.includes('/modules/workers/manager.ts'))
}

/** Asserts `actual` (a `Set<string>`) is EXACTLY `expected`, order-independent — a real, reviewed
 * footprint check ("this component reaches these subpaths and NO others"), not just "reaches at
 * least these." */
function assertSetEquals(actual: Set<string>, expected: readonly string[], message: string) {
  assertEquals([...actual].sort(), [...expected].sort(), message)
}

Deno.test('mod.ts (React entrypoint): reaches react as a real code dependency', async () => {
  const graph = await moduleGraph('mod.ts')
  assert(includesPackage(graph.code, 'react'), 'expected react as a code dependency of mod.ts')
})

Deno.test(
  'mod.ts (React entrypoint): never reaches preact, at compile time or runtime',
  async () => {
    const graph = await moduleGraph('mod.ts')
    assert(!includesPackage(graph.code, 'preact'), 'preact leaked into mod.ts as code')
    assert(!includesPackage(graph.type, 'preact'), 'preact leaked into mod.ts as a type')
  },
)

Deno.test(
  'mod.ts (React entrypoint): the ICU parser is reachable only as a type, never as code',
  async () => {
    const graph = await moduleGraph('mod.ts')
    assert(
      includesPackage(graph.type, '@formatjs/icu-messageformat-parser'),
      'expected the parser package as a type dependency (typing the AST catalog shape)',
    )
    assert(
      !includesPackage(graph.code, '@formatjs/icu-messageformat-parser'),
      'the ICU parser must never be a real runtime dependency of this package — compiling ICU is ' +
        "@zanix/cli's own job",
    )
  },
)

Deno.test(
  'mod-preact.ts (Preact entrypoint): reaches preact core as a real code dependency, never ' +
    'preact/compat',
  async () => {
    const graph = await moduleGraph('mod-preact.ts')
    assert(
      includesPackage(graph.code, 'preact'),
      'expected preact as a code dependency of mod-preact.ts',
    )
    assert(!includesPackage(graph.code, 'preact/compat'), 'preact/compat must never be reachable')
    assert(!includesPackage(graph.type, 'preact/compat'), 'preact/compat must never be reachable')
  },
)

Deno.test(
  'mod-preact.ts (Preact entrypoint): never reaches react/react-dom, at compile time or runtime',
  async () => {
    const graph = await moduleGraph('mod-preact.ts')
    for (const pkg of ['react', 'react-dom']) {
      assert(!includesPackage(graph.code, pkg), `${pkg} leaked into mod-preact.ts as code`)
      assert(!includesPackage(graph.type, pkg), `${pkg} leaked into mod-preact.ts as a type`)
    }
  },
)

Deno.test(
  'mod-preact.ts (Preact entrypoint): the ICU parser is reachable only as a type, never as code',
  async () => {
    const graph = await moduleGraph('mod-preact.ts')
    assert(includesPackage(graph.type, '@formatjs/icu-messageformat-parser'))
    assert(!includesPackage(graph.code, '@formatjs/icu-messageformat-parser'))
  },
)

Deno.test(
  'mod.ts and mod-preact.ts: both reach @formatjs/intl as a real code dependency',
  async () => {
    const [react, preact] = await Promise.all([moduleGraph('mod.ts'), moduleGraph('mod-preact.ts')])
    assert(includesPackage(react.code, '@formatjs/intl'))
    assert(includesPackage(preact.code, '@formatjs/intl'))
  },
)

Deno.test(
  'mod.ts and mod-preact.ts: reach @zanix/space EXACTLY {video-source}, never assets-manifest/' +
    'comet/anything else',
  async () => {
    // The whole-barrel version of the same regression test the table below runs per component —
    // kept as its own explicit test since `.`/`./preact` are the two entrypoints most consumers
    // actually import from directly. No longer a blanket "zero @zanix/space" check: `Video`'s own
    // root-barrel binding (composed here) carries a real, unconditional `@zanix/space/video-source`
    // dependency (classification logic, not asset resolution — see the dedicated `root barrel —
    // Video` test's own doc for why that one subpath is genuinely safe for a Comet). The real,
    // checkable invariant is narrower: EXACTLY `video-source`, never `assets-manifest` (the one
    // real `'server-only'`-flagged dependency) or `comet`, and never as a type dependency either.
    const [react, preact] = await Promise.all([moduleGraph('mod.ts'), moduleGraph('mod-preact.ts')])
    const entries = [['mod.ts', react], ['mod-preact.ts', preact]] as const
    // `Promise.all` up front, not an `await` per loop iteration — both checks are independent,
    // never short-circuiting, so there's no reason to serialize them.
    const results = await Promise.all(
      entries.map(async ([entry, graph]) => ({
        entry,
        subpaths: zanixSpaceSubpaths(graph.code),
        typeLeak: await includesZanixSpace(graph.type),
      })),
    )
    for (const { entry, subpaths, typeLeak } of results) {
      assertSetEquals(
        subpaths,
        ['video-source'],
        `${entry}'s real @zanix/space subpath footprint drifted from the reviewed expectation ` +
          '(exactly video-source, via the root-barrel Video binding) — update this test if the ' +
          "drift is intentional and still comet-safe, don't just widen it",
      )
      assert(!typeLeak, `@zanix/space leaked into ${entry} as a type dependency`)
    }
  },
)

// ---------------------------------------------------------------------------------------------
// Table 1: every component exported from mod.ts/mod-preact.ts (the root barrel) — each checked
// against ITS OWN entry file directly (`src/components/<Name>/index[.preact].ts`), never through
// the shared barrel, so a future barrel accident can't hide a real per-component leak. Add a new
// component here the moment it's exported from the root barrel — nothing else needed.
// ---------------------------------------------------------------------------------------------

// `Video` is deliberately NOT in this list — see the dedicated `root barrel — Video` test below for
// why it needs a narrower, subpath-specific check instead of the blanket "zero @zanix/space" one
// every other root-barrel component (including `Image`) gets here.
const ROOT_BARREL_COMPONENTS = [
  'Accordion',
  'Alert',
  'Button',
  'Card',
  'CatalogIcon',
  'Combobox',
  'Counter',
  'Disclosure',
  'Drawer',
  'Field',
  'FileInput',
  'Grid',
  'HCaptcha',
  'IFrame',
  'Icon',
  'Image',
  'ImgButton',
  'Input',
  'Link',
  'Menu',
  'Modal',
  'Pagination',
  'Popover',
  'ProgressBar',
  'RadioGroup',
  'Recaptcha',
  'Select',
  'Showcase',
  'Skeleton',
  'Slider',
  'SocialNetworks',
  'StructuredData',
  'Table',
  'Tabs',
  'Toast',
  'Tooltip',
  'Turnstile',
  'VisuallyHidden',
] as const

for (const name of ROOT_BARREL_COMPONENTS) {
  Deno.test(
    `root barrel — ${name}: NEVER reaches @zanix/space, at compile time or runtime (own entry ` +
      'file, React + Preact)',
    async () => {
      const [react, preact] = await Promise.all([
        moduleGraph(`src/components/${name}/index.ts`),
        moduleGraph(`src/components/${name}/index.preact.ts`),
      ])
      const renderers = [['React', react], ['Preact', preact]] as const
      // `Promise.all` up front, not an `await` per loop iteration — both checks are independent,
      // never short-circuiting, so there's no reason to serialize them.
      const results = await Promise.all(
        renderers.map(async ([renderer, graph]) => ({
          renderer,
          codeLeak: await includesZanixSpace(graph.code),
          typeLeak: await includesZanixSpace(graph.type),
        })),
      )
      for (const { renderer, codeLeak, typeLeak } of results) {
        assert(!codeLeak, `@zanix/space leaked into ${name} (${renderer}) as a code dependency`)
        assert(!typeLeak, `@zanix/space leaked into ${name} (${renderer}) as a type dependency`)
      }
    },
  )
}

/**
 * `Video`'s own root-barrel row — NOT part of `ROOT_BARREL_COMPONENTS` above, deliberately: unlike
 * every other root-barrel component (including `Image`, right next to it in that list),
 * `Video/render.ts` keeps a real, UNCONDITIONAL dependency on `@zanix/space/video-source`
 * (`detectVideoSource`/`buildProviderEmbedUrl`) even in this comet-safe binding — real
 * classification logic every branch needs (YouTube/Vimeo/generic-iframe/file), not an
 * asset-resolution nicety `resolveHref`'s own optional-injection treatment could remove. Confirmed
 * safe for a Comet regardless: `video-source.ts` carries no `'server-only'` directive (unlike
 * `assets-manifest.ts`, which `Video`'s root-barrel binding must still never reach) and is
 * documented as "pure and synchronous — never throws, never does I/O or network access". So the
 * real, checkable invariant here is narrower than "zero `@zanix/space`" — it's "reaches EXACTLY
 * `video-source`, never `assets-manifest` (or any other subpath)" — verified the same
 * `zanixSpaceSubpaths`-based way `RUNTIME_COMPONENTS` below checks each `./runtime/*` row's own
 * exact footprint, applied here to a root-barrel entry file instead.
 */
Deno.test(
  'root barrel — Video: reaches EXACTLY @zanix/space/video-source, never assets-manifest (own ' +
    'entry file, React + Preact)',
  async () => {
    const [react, preact] = await Promise.all([
      moduleGraph('src/components/Video/index.ts'),
      moduleGraph('src/components/Video/index.preact.ts'),
    ])
    const renderers = [['React', react], ['Preact', preact]] as const
    // `Promise.all` up front, not an `await` per loop iteration — both checks are independent,
    // never short-circuiting, so there's no reason to serialize them.
    const results = await Promise.all(
      renderers.map(async ([renderer, graph]) => ({
        renderer,
        subpaths: zanixSpaceSubpaths(graph.code),
        typeLeak: await includesZanixSpace(graph.type),
      })),
    )
    for (const { renderer, subpaths, typeLeak } of results) {
      assertSetEquals(
        subpaths,
        ['video-source'],
        `root-barrel Video (${renderer})'s real @zanix/space subpath footprint drifted — expected ` +
          'exactly video-source (classification, safe for a Comet), never assets-manifest (the ' +
          "real 'server-only' dependency this binding must stay comet-safe against)",
      )
      assert(
        !typeLeak,
        `@zanix/space leaked into root-barrel Video (${renderer}) as a type dependency`,
      )
    }
  },
)

// ---------------------------------------------------------------------------------------------
// Table 2: every `./runtime/*` subpath — each row is the human-reviewed EXACT expected footprint,
// not just "reaches @zanix/space somehow." `composes` lists sibling runtime components genuinely,
// intentionally reachable through real composition (e.g. `RichText` composing `Image`'s/`Video`'s
// own `render.ts`) — every OTHER sibling runtime component is asserted UNREACHABLE, automatically,
// without needing to hand-list every forbidden name per row.
//
// `ImgButton`/`Card` are NOT in this table (or `ALL_RUNTIME_COMPONENTS` below) even though
// `RichText/tags.ts` still directly imports `ImgButton/render.ts` for its own `ibtn` tag — both
// components moved to the root barrel once each got its own `visual` render-prop (the same fix
// `Menu` already got) and stopped composing `Image` themselves. `composes` here specifically means
// "a sibling `./runtime/*` component this one is allowed to reach" — `ImgButton` is no longer a
// `./runtime/*` sibling at all, so the cross-contamination guard this field exists for doesn't
// apply to it anymore (it carries zero `@zanix/space` reachability of its own now — see its own
// `root barrel — ImgButton` test above). The real `RichText`→`ImgButton` composition itself is
// unchanged and still verified — indirectly, via `RichText`'s own `zanixSpaceSubpaths` staying
// exactly `['assets-manifest', 'video-source']` (unaffected by `ImgButton`'s move, confirmed via
// `deno info --json`, since `RichText` already reaches `assets-manifest` directly through
// `Image`/`resolve.ts`) — not via a dedicated row in this sibling-only table.
// ---------------------------------------------------------------------------------------------

interface RuntimeComponentExpectation {
  name: string
  reactEntry: string
  preactEntry: string
  /** The exact, reviewed set of `@zanix/space` subpaths this component's own module directly
   * resolves — see `zanixSpaceSubpaths`'s own doc for why only the raw, direct specifier counts.
   * A plain array when both renderer entries reach the identical set (the common case — an
   * `assets-manifest`/`video-source` resolver call is the same specifier regardless of active
   * renderer); `{ react, preact }` when the two entries genuinely differ, e.g. `NavDrawer`'s own
   * `useCometStableId` import, which is a real, DIFFERENT subpath per renderer
   * (`comet/react`/`comet/preact`). */
  zanixSpaceSubpaths: readonly string[] | { react: readonly string[]; preact: readonly string[] }
  /** Sibling `./runtime/*` components genuinely, intentionally composed — real coupling, not a
   * barrel accident. Every sibling NOT listed here must be completely unreachable. */
  composes: readonly string[]
}

/** Resolves one component's own expected subpath set for `renderer` — see
 * {@linkcode RuntimeComponentExpectation.zanixSpaceSubpaths}'s own doc for the two shapes this
 * reads. */
function expectedSubpathsFor(
  component: RuntimeComponentExpectation,
  renderer: 'React' | 'Preact',
): readonly string[] {
  const { zanixSpaceSubpaths } = component
  if (Array.isArray(zanixSpaceSubpaths)) return zanixSpaceSubpaths
  const perRenderer = zanixSpaceSubpaths as { react: readonly string[]; preact: readonly string[] }
  return renderer === 'React' ? perRenderer.react : perRenderer.preact
}

const ALL_RUNTIME_COMPONENTS = ['Video', 'Image', 'RichText', 'NavDrawer']

const RUNTIME_COMPONENTS: readonly RuntimeComponentExpectation[] = [
  {
    name: 'Video',
    reactEntry: 'src/runtime/video.ts',
    preactEntry: 'src/runtime/video.preact.ts',
    // `Video/render.ts` resolves both directly: `resolveAssetHref` for the local/CDN file case,
    // `detectVideoSource`/`buildProviderEmbedUrl` for the YouTube/Vimeo/generic-embed case.
    zanixSpaceSubpaths: ['assets-manifest', 'video-source'],
    composes: [],
  },
  {
    name: 'Image',
    reactEntry: 'src/runtime/image.ts',
    preactEntry: 'src/runtime/image.preact.ts',
    zanixSpaceSubpaths: ['assets-manifest'],
    composes: [],
  },
  {
    name: 'RichText',
    reactEntry: 'src/runtime/rich-text.ts',
    preactEntry: 'src/runtime/rich-text.preact.ts',
    // Resolves `assets-manifest` directly itself too (`RichText/resolve.ts`), on top of composing
    // `Image`'s/`Video`'s own `render.ts` factories for its `img`/`video` tags (and `ImgButton`'s
    // own `render.ts` for `ibtn` — not a `./runtime/*` sibling anymore, see this table's own header
    // comment) — `video-source` is reached transitively THROUGH composing `Video`, never directly.
    zanixSpaceSubpaths: ['assets-manifest', 'video-source'],
    composes: ['Image', 'Video'],
  },
  {
    name: 'NavDrawer',
    reactEntry: 'src/runtime/nav-drawer.ts',
    preactEntry: 'src/runtime/nav-drawer.preact.ts',
    // A real Comet — `defineComet` from `@zanix/space/comet` directly, never `resolveAssetHref`.
    // Composes `Button`/`Drawer`/`Menu` (all three root-barrel, zero-`@zanix/space` components,
    // so they're not part of THIS table) — explicitly none of the other runtime components.
    // `comet/react`/`comet/preact` diverge per renderer: `useCometStableId` for `panelId` (see
    // `NavDrawer/render.ts`'s own `NavDrawerHooks` doc), each renderer entry importing only its
    // own.
    zanixSpaceSubpaths: { react: ['comet', 'comet/react'], preact: ['comet', 'comet/preact'] },
    composes: [],
  },
]

for (const component of RUNTIME_COMPONENTS) {
  const forbiddenSiblings = ALL_RUNTIME_COMPONENTS.filter(
    (dir) => dir !== component.name && !component.composes.includes(dir),
  )

  // Both renderers' own expected sets, deduplicated, purely for the test's own title — the
  // assertion itself always compares against the RIGHT renderer's own set (`expectedSubpathsFor`).
  const describedSubpaths = [
    ...new Set([
      ...expectedSubpathsFor(component, 'React'),
      ...expectedSubpathsFor(component, 'Preact'),
    ]),
  ]

  Deno.test(
    `./runtime/* — ${component.name}: reaches exactly @zanix/space/{${
      describedSubpaths.join(', ')
    }}, never a shared barrel`,
    async () => {
      const [react, preact] = await Promise.all([
        moduleGraph(component.reactEntry),
        moduleGraph(component.preactEntry),
      ])
      for (const [renderer, graph] of [['React', react], ['Preact', preact]] as const) {
        assertSetEquals(
          zanixSpaceSubpaths(graph.code),
          expectedSubpathsFor(component, renderer),
          `${component.name} (${renderer})'s real @zanix/space subpath footprint drifted from ` +
            'the reviewed expectation in this table — update the table if the drift is intentional',
        )
      }
    },
  )

  Deno.test(
    `./runtime/* — ${component.name}: never reaches a SIBLING runtime component's own files, ` +
      'except real, listed composition',
    async () => {
      const [react, preact] = await Promise.all([
        moduleGraph(component.reactEntry),
        moduleGraph(component.preactEntry),
      ])
      for (const [renderer, graph] of [['React', react], ['Preact', preact]] as const) {
        for (const dir of forbiddenSiblings) {
          assert(
            !includesComponentDir(graph.code, dir) && !includesComponentDir(graph.type, dir),
            `${component.name} (${renderer}) unexpectedly reaches ${dir}'s own files — the exact ` +
              'barrel-cross-contamination bug this suite exists to catch (see src/runtime/video.ts' +
              "'s own @module doc)",
          )
        }
        for (const dir of component.composes) {
          assert(
            includesComponentDir(graph.code, dir),
            `${component.name} (${renderer}) was expected to compose ${dir} (per this table) but ` +
              `${dir}'s own files are no longer reachable — either the composition was removed ` +
              '(update this table) or genuinely broke',
          )
        }
      }
    },
  )
}

Deno.test(
  "RichText: NEVER reaches @zanix/utils/helpers's own worker/logger chain — a formerly-known " +
    '@zanix/utils-side gap, closed as of @zanix/utils@4.4.0',
  async () => {
    // `RichText/tags.ts` imports `isPlainObject`/`sanitizeUrl` from `@zanix/helpers`
    // (`jsr:@zanix/utils@^4.4.0/helpers`). Until `4.4.0`, that barrel's own `cron.ts`/
    // `masking/hard.ts` imported the full `modules/logger/mod.ts` for a couple of log calls,
    // whose own top-level `registerFileSaveFactory` side effect unconditionally wired in
    // `WorkerManager` (`modules/workers/manager.ts`) — reachable from ANY consumer of the barrel,
    // `RichText` included, not something this package's own `./runtime` split could fix on its
    // own. `4.4.0` fixed it at the source (`modules/logger/internal.ts`, a minimal browser-safe
    // logger neither file needs `mod.ts`'s full registration for) — confirmed here by re-running
    // this exact assertion inverted: it failed the moment `deno.jsonc`'s own `@zanix/helpers`
    // floor was bumped to `^4.4.0` and `deno.lock` re-resolved, exactly as this test's own prior
    // doc anticipated ("if @zanix/utils ever narrows its own /helpers barrel, this assertion
    // starts failing — that's the signal to drop this exception"). Kept as a permanent regression
    // guard now that the direction is reversed: this must never start passing again in reverse.
    const [react, preact] = await Promise.all([
      moduleGraph('src/runtime/rich-text.ts'),
      moduleGraph('src/runtime/rich-text.preact.ts'),
    ])
    for (const [renderer, graph] of [['React', react], ['Preact', preact]] as const) {
      assert(
        !includesUtilsWorkerChain(graph.code),
        `@zanix/utils's own workers/manager.ts chain leaked back into RichText (${renderer}) via ` +
          "@zanix/helpers's barrel — the @zanix/utils@4.4.0 fix this test guards may have " +
          'regressed upstream; bump the floor further or re-open the tracked gap, not a ' +
          'this-package-side fix',
      )
    }
  },
)

Deno.test(
  './runtime/rich-text and ./runtime/rich-text/preact: both reach markdown-to-jsx, but never ' +
    'through preact/compat',
  async () => {
    // `RichText/markdown.ts` only ever imports `markdown-to-jsx`'s own `/markdown` subpath — a
    // pure markdown→AST parser with zero React import at runtime (confirmed directly against its
    // real built JS, see `markdown.ts`'s own doc) — walked by hand via `h`/`createElement`
    // instead of that package's own JSX renderer. This is the empirical proof that choice actually
    // holds: markdown-to-jsx is reachable from both `RichText` renderer entries, yet
    // `preact/compat` still isn't, and the Preact entry still never reaches `react` either — a
    // naive integration using markdown-to-jsx's own `/react` renderer would have broken exactly
    // this. `RichText` is the ONLY consumer of `markdown-to-jsx` in this package (see the table
    // above — no other `./runtime/*` or root-barrel component lists it).
    const [react, preact] = await Promise.all([
      moduleGraph('src/runtime/rich-text.ts'),
      moduleGraph('src/runtime/rich-text.preact.ts'),
    ])
    assert(includesPackage(react.code, 'markdown-to-jsx'))
    assert(includesPackage(preact.code, 'markdown-to-jsx'))
    assert(!includesPackage(preact.code, 'preact/compat'), 'preact/compat must never be reachable')
    assert(!includesPackage(preact.type, 'preact/compat'), 'preact/compat must never be reachable')
    assert(!includesPackage(preact.code, 'react'), 'react must never leak into the Preact entry')
  },
)
