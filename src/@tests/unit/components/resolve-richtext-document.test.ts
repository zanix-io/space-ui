import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert'
import { resolveRichTextDocument } from 'components/RichText/resolve.ts'

// A small, local fetch stub — this is the only test file needing one so far; extract a shared
// `installFetchMock()` helper into `dom-test-setup.ts` only once a real second consumer needs it,
// the same "don't extract ahead of a second consumer" discipline this package applies throughout.
function stubFetch(handler: (input: string | URL) => Response) {
  const previousFetch = globalThis.fetch
  // deno-lint-ignore require-await
  globalThis.fetch = (async (input: string | URL) => handler(input)) as typeof fetch
  return { restore: () => (globalThis.fetch = previousFetch) }
}

Deno.test('resolveRichTextDocument: an absolute URL fetches directly, untouched', async () => {
  const calls: string[] = []
  const stub = stubFetch((input) => {
    calls.push(String(input))
    return new Response('# Terms', { status: 200 })
  })
  try {
    const content = await resolveRichTextDocument('https://cdn.example.com/terms.md')
    assertEquals(content, '# Terms')
    assertEquals(calls, ['https://cdn.example.com/terms.md'])
  } finally {
    stub.restore()
  }
})

Deno.test('resolveRichTextDocument: a relative path resolves via resolveAssetHref', async () => {
  const calls: string[] = []
  const stub = stubFetch((input) => {
    calls.push(String(input))
    return new Response('Body text', { status: 200 })
  })
  try {
    await resolveRichTextDocument('docs/terms.md')
    // No manifest loaded in this test environment — falls back to `resolveAssetHref`'s own
    // documented `/assets/<path>` shape, the same fallback `Video`'s own tests already rely on.
    assertEquals(calls, ['/assets/docs/terms.md'])
  } finally {
    stub.restore()
  }
})

Deno.test('resolveRichTextDocument: baseUrl resolves a relative path to a full URL', async () => {
  const calls: string[] = []
  const stub = stubFetch((input) => {
    calls.push(String(input))
    return new Response('Body text', { status: 200 })
  })
  try {
    await resolveRichTextDocument('docs/terms.md', { baseUrl: 'https://app.example.com' })
    assertEquals(calls, ['https://app.example.com/assets/docs/terms.md'])
  } finally {
    stub.restore()
  }
})

Deno.test('resolveRichTextDocument: without baseUrl, a path stays root-relative', async () => {
  const calls: string[] = []
  const stub = stubFetch((input) => {
    calls.push(String(input))
    return new Response('ok', { status: 200 })
  })
  try {
    await resolveRichTextDocument('docs/terms.md')
    assertEquals(calls, ['/assets/docs/terms.md'])
  } finally {
    stub.restore()
  }
})

Deno.test('resolveRichTextDocument: a non-OK response rejects, not silently rendered', async () => {
  const stub = stubFetch(() => new Response('Not Found', { status: 404, statusText: 'Not Found' }))
  try {
    await assertRejects(
      () => resolveRichTextDocument('docs/missing.md'),
      Error,
      'docs/missing.md',
    )
  } finally {
    stub.restore()
  }
})

Deno.test('resolveRichTextDocument: the rejection message includes the status', async () => {
  const stub = stubFetch(() => new Response('', { status: 500, statusText: 'Server Error' }))
  try {
    let message = ''
    await assertRejects(
      async () => {
        try {
          await resolveRichTextDocument('docs/broken.md')
        } catch (error) {
          message = (error as Error).message
          throw error
        }
      },
    )
    assertStringIncludes(message, '500')
  } finally {
    stub.restore()
  }
})

Deno.test('resolveRichTextDocument: an absolute URL skips resolveAssetHref entirely', async () => {
  const calls: string[] = []
  const stub = stubFetch((input) => {
    calls.push(String(input))
    return new Response('content', { status: 200 })
  })
  try {
    await resolveRichTextDocument('https://other.example.com/a/b/c.md')
    // Confirms the absolute-URL branch never runs it through `resolveAssetHref` at all — a
    // manifest miss there would otherwise produce a nonsense `/assets/https://...` path.
    assertEquals(calls, ['https://other.example.com/a/b/c.md'])
  } finally {
    stub.restore()
  }
})
