import { assertEquals } from '@std/assert'
import { render } from 'preact-render-to-string'
import type { Organization } from 'schema-dts'
import { StructuredData } from 'components/StructuredData/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.

Deno.test(
  'StructuredData (preact): emits a script tag with the exact given data as JSON-LD',
  () => {
    const data: Organization & { '@context': 'https://schema.org' } = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Zanix',
    }

    const html = render(StructuredData<Organization>({ data }))

    assertEquals(
      html,
      `<script type="application/ld+json">${JSON.stringify(data)}</script>`,
    )
  },
)

Deno.test('StructuredData (preact): defaults @context to schema.org when data omits it', () => {
  const data = { '@type': 'Organization', name: 'Zanix' } as const

  const html = render(StructuredData<Organization>({ data }))

  assertEquals(
    html,
    `<script type="application/ld+json">${
      JSON.stringify({ '@context': 'https://schema.org', ...data })
    }</script>`,
  )
})
