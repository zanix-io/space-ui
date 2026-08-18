import { assert } from '@std/assert'

/**
 * Structural guard rails for this package's own renderer boundary, now that `intl/` adds a real
 * npm dependency (`@formatjs/intl`) to both entrypoints. Verified via `deno info --json`'s actual
 * resolved module graph — TRANSITIVE reachability, not a grep over `deno.jsonc`'s own `imports`
 * map, which would miss a package pulled in indirectly through some other dependency.
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
  'mod.ts and mod-preact.ts: both reach @formatjs/intl as a real code dependency — the one ' +
    'formatting dependency this package owns',
  async () => {
    const [react, preact] = await Promise.all([moduleGraph('mod.ts'), moduleGraph('mod-preact.ts')])
    assert(includesPackage(react.code, '@formatjs/intl'))
    assert(includesPackage(preact.code, '@formatjs/intl'))
  },
)
