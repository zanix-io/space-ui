import { assertEquals } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Organization } from 'schema-dts'
import { StructuredData } from 'components/StructuredData/index.ts'

Deno.test('StructuredData: emits a script tag with the exact given data as JSON-LD', () => {
  const data: Organization & { '@context': 'https://schema.org' } = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Zanix',
  }

  const html = renderToStaticMarkup(
    <StructuredData<Organization> data={data} />,
  )

  assertEquals(
    html,
    `<script type="application/ld+json">${JSON.stringify(data)}</script>`,
  )
})

Deno.test(
  'StructuredData: an explicit @context is never overridden, even a non-default one',
  () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'zanix.dev',
    } as const

    const html = renderToStaticMarkup(<StructuredData data={data} />)

    assertEquals(html.includes(JSON.stringify(data)), true)
  },
)

Deno.test('StructuredData: defaults @context to schema.org when data omits it', () => {
  const data = { '@type': 'Organization', name: 'Zanix' } as const

  const html = renderToStaticMarkup(<StructuredData<Organization> data={data} />)

  assertEquals(
    html,
    `<script type="application/ld+json">${
      JSON.stringify({ '@context': 'https://schema.org', ...data })
    }</script>`,
  )
})
