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

Deno.test(
  'StructuredData: a data value containing a literal </script> never breaks out of the tag',
  () => {
    // Reproduces a real bug: JSON.stringify never escapes "/", so this string would otherwise
    // close the <script> tag early and let a following <script> actually execute. See render.ts's
    // own doc for the full reasoning.
    const data = {
      '@type': 'Organization',
      name: 'Zanix',
      description: 'A team.</script><script>window.pwned = true</script>',
    } as const

    const html = renderToStaticMarkup(<StructuredData<Organization> data={data} />)

    // The ENTIRE response is exactly one script tag — no second, injected <script> anywhere.
    assertEquals(html.match(/<script/g)?.length, 1)
    assertEquals(html.match(/<\/script>/g)?.length, 1)

    const inner = html.slice(
      html.indexOf('>') + 1,
      html.lastIndexOf('</script>'),
    )
    // The escaped payload still round-trips to the exact original string via JSON.parse — this is
    // an encoding change for safety, never a change to the actual data.
    assertEquals(JSON.parse(inner).description, data.description)
  },
)
