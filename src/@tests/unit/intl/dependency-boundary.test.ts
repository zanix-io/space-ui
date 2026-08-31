import { assert } from '@std/assert'
import { dirname, fromFileUrl } from '@std/path'

/**
 * Structural guard rails for this package's own renderer boundary, now that `intl/` and
 * `RichText/markdown.ts` each add a real npm dependency (`@formatjs/intl`, `markdown-to-jsx`) to
 * both entrypoints. Verified via `deno info --json`'s actual resolved module graph — TRANSITIVE
 * reachability, not a grep over `deno.jsonc`'s own `imports` map, which would miss a package
 * pulled in indirectly through some other dependency.
 *
 * `code` vs `type` edges are checked separately throughout: a `type` edge is erased at compile
 * time and never bundled or evaluated (see `formatter.ts`'s own doc for why
 * `@formatjs/icu-messageformat-parser` is deliberately only ever a `type` edge here) — collapsing
 * the two into one check would make "reachable in a type position" indistinguishable from
 * "reachable at runtime", which is exactly the distinction this suite exists to keep honest.
 *
 * @module
 */

interface ModuleGraph {
  code: Set<string>
  type: Set<string>
}

async function moduleGraph(entry: string): Promise<ModuleGraph> {
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
 * for the circular-resolution bug `runtime.ts`'s own `@module` doc describes: `.`/`./preact` must
 * NEVER reach it, `./runtime`/`./runtime/preact` always must. Matches the raw import-map form
 * (`jsr:@zanix/space@...`), its fully resolved form (`https://jsr.io/@zanix/space/...`, which
 * also covers `@zanix/space`'s own internal files pulled in transitively, e.g.
 * `video-source.ts`'s own `content-type.ts`), AND the local `file://` form Deno's own workspace
 * auto-linking produces when this repo happens to be checked out inside a Deno workspace that
 * also has `@zanix/space` as a sibling member (see the `deno-workspace-link-pitfalls` skill) —
 * CI's plain sibling checkout never triggers this branch, only a local monorepo checkout does.
 * A `file://` match is confirmed via the resolved module's own nearest `deno.json`'s `"name"`,
 * never a path-text guess, so it never collides with `@zanix/space-ui` (this package's own
 * specifier) or an unrelated same-named local folder.
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
  'runtime.ts and runtime-preact.ts: both reach markdown-to-jsx, but never through preact/compat',
  async () => {
    // `RichText/markdown.ts` only ever imports `markdown-to-jsx`'s own `/markdown` subpath — a
    // pure markdown→AST parser with zero React import at runtime (confirmed directly against its
    // real built JS, see `markdown.ts`'s own doc) — walked by hand via `h`/`createElement`
    // instead of that package's own JSX renderer. This is the empirical proof that choice actually
    // holds: markdown-to-jsx is reachable in both `./runtime` entrypoints, yet `preact/compat`
    // still isn't, and `runtime-preact.ts` still never reaches `react` either — a naive
    // integration using markdown-to-jsx's own `/react` renderer would have broken exactly this.
    // `RichText` (this package's only consumer of `markdown-to-jsx`) lives in `./runtime`/
    // `./runtime/preact`, not the default `.`/`./preact` barrel — see `runtime.ts`'s own doc.
    const [react, preact] = await Promise.all([
      moduleGraph('src/runtime.ts'),
      moduleGraph('src/runtime-preact.ts'),
    ])
    assert(includesPackage(react.code, 'markdown-to-jsx'))
    assert(includesPackage(preact.code, 'markdown-to-jsx'))
    assert(!includesPackage(preact.code, 'preact/compat'), 'preact/compat must never be reachable')
    assert(!includesPackage(preact.type, 'preact/compat'), 'preact/compat must never be reachable')
  },
)

Deno.test(
  'mod.ts and mod-preact.ts: NEVER reach @zanix/space, at compile time or runtime',
  async () => {
    // The actual regression test for the circular-resolution bug fixed by splitting `Video`/
    // `Image`/`RichText`/`ImgButton`/`Card`/`Menu` out into `./runtime`/`./runtime/preact` — see
    // `src/runtime.ts`'s own `@module` doc for the full story. A barrel export forces resolution
    // of everything it re-exports together, so if any of those six ever leaked back into this
    // barrel, importing even one unrelated component (e.g. `Button`) would drag `@zanix/space`
    // back into the graph — and since `@zanix/space`'s own build pipeline is what resolves a
    // `@zanix/space-ui` import in a real `@zanix/space` app, that's a genuine circular resolution,
    // not just an unwanted dependency.
    const [react, preact] = await Promise.all([moduleGraph('mod.ts'), moduleGraph('mod-preact.ts')])
    assert(
      !(await includesZanixSpace(react.code)),
      '@zanix/space leaked into mod.ts as a code dependency',
    )
    assert(
      !(await includesZanixSpace(react.type)),
      '@zanix/space leaked into mod.ts as a type dependency',
    )
    assert(
      !(await includesZanixSpace(preact.code)),
      '@zanix/space leaked into mod-preact.ts as a code dependency',
    )
    assert(
      !(await includesZanixSpace(preact.type)),
      '@zanix/space leaked into mod-preact.ts as a type dependency',
    )
  },
)

Deno.test(
  'runtime.ts and runtime-preact.ts: both DO reach @zanix/space/assets-manifest as a real code ' +
    'dependency',
  async () => {
    // The other half of the same regression test — confirms the split didn't just hide the
    // dependency, it moved it to the entrypoint that's actually supposed to carry it.
    const [react, preact] = await Promise.all([
      moduleGraph('src/runtime.ts'),
      moduleGraph('src/runtime-preact.ts'),
    ])
    assert(
      await includesZanixSpace(react.code),
      'expected @zanix/space as a real code dependency of runtime.ts',
    )
    assert(
      await includesZanixSpace(preact.code),
      'expected @zanix/space as a real code dependency of runtime-preact.ts',
    )
  },
)
