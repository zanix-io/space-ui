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

Deno.test(
  'StructuredData (preact): a data value containing a literal </script> never breaks out',
  () => {
    // Same reproduction as the React counterpart's own test — see that file's comment, and
    // render.ts's own doc, for the full reasoning.
    const data = {
      '@type': 'Organization',
      name: 'Zanix',
      description: 'A team.</script><script>window.pwned = true</script>',
    } as const

    const html = render(StructuredData<Organization>({ data }))

    assertEquals(html.match(/<script/g)?.length, 1)
    assertEquals(html.match(/<\/script>/g)?.length, 1)

    const inner = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'))
    assertEquals(JSON.parse(inner).description, data.description)
  },
)
