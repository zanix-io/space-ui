import { assertEquals } from '@std/assert'
import type { Organization } from 'schema-dts'
import { resolveStructuredData } from 'components/StructuredData/resolve.ts'

Deno.test('resolveStructuredData: defaults @context to schema.org when data omits it', () => {
  const result = resolveStructuredData<Organization>({ '@type': 'Organization', name: 'Zanix' })

  assertEquals(result, { '@context': 'https://schema.org', '@type': 'Organization', name: 'Zanix' })
})

Deno.test(
  'resolveStructuredData: never overrides an explicit @context, even a non-default one',
  () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'zanix.dev',
    } as const

    const result = resolveStructuredData(data)

    assertEquals(result, data)
  },
)

Deno.test('resolveStructuredData: never mutates the input object', () => {
  const data = { '@type': 'Organization', name: 'Zanix' } as const

  const result = resolveStructuredData<Organization>(data)

  assertEquals('@context' in data, false)
  assertEquals(result === (data as never), false)
})
