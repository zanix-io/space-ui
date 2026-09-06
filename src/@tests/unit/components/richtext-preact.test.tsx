import { h } from 'preact'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes, assertThrows } from '@std/assert'
import { IntlProvider } from 'intl/index.preact.ts'
import { RichText } from 'components/RichText/index.preact.ts'
import type { FormatMessageValues, Messages } from 'intl/formatter.ts'

function html(content: string, values?: FormatMessageValues, messages: Messages = {}) {
  return renderToString(
    h(IntlProvider, { locale: 'en', messages }, h(RichText, { content, values })),
  )
}

// --- ICU mode: basic tags --------------------------------------------------------------------

Deno.test('RichText (preact): renders a plain message with no tags at all', () => {
  assertEquals(html('just text'), 'just text')
})

Deno.test('RichText (preact): content is a catalog id, falling back to itself', () => {
  assertEquals(html('greet', undefined, { greet: 'Hello!' }), 'Hello!')
  assertStringIncludes(html('<b>not a real id</b>'), '>not a real id</strong>')
})

Deno.test('RichText (preact): basic structural/text tags map to real host elements', () => {
  assertStringIncludes(html('<h1>Title</h1>'), '<h1 data-space-ui="richtext">Title</h1>')
  assertStringIncludes(html('<b>bold</b>'), '<strong data-space-ui="richtext">bold</strong>')
  assertStringIncludes(html('<n>nav</n>'), '<nav data-space-ui="richtext">nav</nav>')
})

Deno.test('RichText (preact): nested basic tags nest correctly', () => {
  const result = html('<p>a <b>bold <i>and italic</i></b> word</p>')
  assertStringIncludes(result, 'data-space-ui="richtext">a <strong data-space-ui="richtext">bold')
})

Deno.test('RichText (preact): ICU interpolation values work alongside tags', () => {
  assertStringIncludes(html('Hello <b>{name}</b>!', { name: 'Ada' }), '>Ada</strong>!')
})

Deno.test('RichText (preact): basic tags default to data-space-ui="richtext"', () => {
  assertStringIncludes(html('<p>x</p>'), 'data-space-ui="richtext"')
})

Deno.test('RichText (preact): <props> can override the default data-space-ui', () => {
  const result = html('<p><props>data-space-ui=custom</props>x</p>')
  assertStringIncludes(result, 'data-space-ui="custom"')
  assertEquals(result.includes('data-space-ui="richtext"'), false)
})

Deno.test('RichText (preact): a zanix component tag keeps its own data-space-ui', () => {
  const result = html('<a><props>href=https://example.com</props>go</a>')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertEquals(result.includes('data-space-ui="richtext"'), false)
})

// --- population: <props> -----------------------------------------------------------------

Deno.test('RichText (preact): <props> sets an id/className on the enclosing tag', () => {
  const result = html('<div><props>id=box&className=card</props>hi</div>')
  assertStringIncludes(result, 'id="box"')
  assertStringIncludes(result, 'class="card"')
})

Deno.test('RichText (preact): multiple <props> blocks merge — className concatenates', () => {
  const result = html('<div><props>className=one</props><props>className=two</props>t</div>')
  assertStringIncludes(result, 'class="one two"')
})

Deno.test('RichText (preact): a <props> style block renders as a real inline style', () => {
  const result = html('<span><props>style[color]=red</props>x</span>')
  assertStringIncludes(result, 'style="color:red')
})

// --- zanix component tags ---------------------------------------------------------------------

Deno.test('RichText (preact): <a> renders through the real Link component', () => {
  const result = html('<a><props>href=https://example.com</props>go</a>')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertStringIncludes(result, 'href="https://example.com"')
})

Deno.test('RichText (preact): <btn> renders through the real Button component', () => {
  const result = html('<btn>Click me</btn>')
  assertStringIncludes(result, '<button')
  assertStringIncludes(result, 'Click me')
})

Deno.test('RichText (preact): <icon> renders through CatalogIcon', () => {
  const result = html('<icon><props>name=gear&href=/sprite.svg</props></icon>')
  assertStringIncludes(result, 'data-space-ui="icon"')
})

Deno.test('RichText (preact): <img> renders through the real Image component', () => {
  const result = html('<img><props>src=pic.jpg&alt=A%20picture</props></img>')
  assertStringIncludes(result, 'data-space-ui="image"')
})

Deno.test('RichText (preact): <video> renders through the real Video — legacy bug fixed', () => {
  const result = html('<video><props>src=clip.mp4</props></video>')
  assertStringIncludes(result, 'data-space-ui="video"')
})

Deno.test('RichText (preact): <sus> renders through Skeleton', () => {
  const result = html('<sus></sus>')
  assertStringIncludes(result, 'data-space-ui="skeleton"')
})

Deno.test('RichText (preact): <sn> renders through the real SocialNetworks component', () => {
  const result = html(
    '<sn><props>links[0][name]=X&links[0][url]=https://x.com&links[0][icon][href]=/sprite.svg&links[0][icon][name]=x-logo</props></sn>',
  )
  assertStringIncludes(result, 'data-space-ui="social-networks"')
  assertStringIncludes(result, 'href="https://x.com"')
})

Deno.test('RichText (preact): <sn> with no <props> at all renders nothing, no crash', () => {
  // Same real bug the React binding's own test documents in full — `tags.ts` is one shared,
  // renderer-agnostic module (`createRichTextTags<E>(h)`), so this confirms the fix end to end
  // through Preact's own `h`/render pipeline too, not just re-testing the same code in isolation.
  const result = html('<sn></sn>')
  assertEquals(result, '<span></span>')
})

// --- custom tags -----------------------------------------------------------------------------

Deno.test('RichText (preact): a custom tag via the tags prop renders alongside built-ins', () => {
  const result = renderToString(
    h(
      IntlProvider,
      { locale: 'en', messages: {} },
      h(RichText, {
        content: '<b>bold</b> and <custom>mine</custom>',
        tags: { custom: (chunks) => h('mark', {}, chunks) },
      }),
    ),
  )
  assertStringIncludes(result, '>bold</strong>')
  assertStringIncludes(result, '<mark>mine</mark>')
})

Deno.test('RichText (preact): a custom tag can override a built-in tag name', () => {
  const result = renderToString(
    h(
      IntlProvider,
      { locale: 'en', messages: {} },
      h(RichText, { content: '<b>x</b>', tags: { b: (chunks) => h('u', {}, chunks) } }),
    ),
  )
  assertStringIncludes(result, '<u>x</u>')
  assertEquals(result.includes('<strong>'), false)
})

// --- markdown mode ----------------------------------------------------------------------------

Deno.test('RichText (preact): contentFormat="markdown" renders literal Markdown', () => {
  const result = renderToString(
    h(
      IntlProvider,
      { locale: 'en', messages: {} },
      h(RichText, { content: '# Title', contentFormat: 'markdown' }),
    ),
  )
  assertStringIncludes(result, '<h1')
  assertStringIncludes(result, 'Title')
})

Deno.test('RichText (preact): markdown mode never treats content as a catalog id', () => {
  const result = renderToString(
    h(
      IntlProvider,
      { locale: 'en', messages: { greet: 'Hello!' } },
      h(RichText, { content: 'greet', contentFormat: 'markdown' }),
    ),
  )
  assertStringIncludes(result, 'greet')
  assertEquals(result.includes('Hello!'), false)
})

Deno.test('RichText (preact): markdown mode never runs content through ICU', () => {
  const jsonCodeBlock = '```json\n{"a": 1}\n```'
  const result = renderToString(
    h(
      IntlProvider,
      { locale: 'en', messages: {} },
      h(RichText, { content: jsonCodeBlock, contentFormat: 'markdown' }),
    ),
  )
  assertStringIncludes(result, '{&quot;a&quot;: 1}')
})

Deno.test('RichText (preact): contentFormat defaults to "icu" when omitted', () => {
  assertStringIncludes(html('<b>x</b>'), '>x</strong>')
})

// --- markdown mode: markdownTags override hatch -----------------------------------------------

Deno.test('RichText (preact): markdownTags overrides the built-in img handling', () => {
  const result = renderToString(
    h(
      IntlProvider,
      { locale: 'en', messages: {} },
      h(RichText, {
        content: '![alt text](pic.jpg)',
        contentFormat: 'markdown',
        markdownTags: {
          img: ({ key, src }: { key: number; src: string }) =>
            h('span', { key, 'data-testid': 'custom-img' }, src),
        },
      }),
    ),
  )
  assertStringIncludes(result, 'data-testid="custom-img"')
  assertStringIncludes(result, '>pic.jpg<')
  assertEquals(result.includes('data-space-ui="image"'), false)
})

Deno.test('RichText (preact): markdownTags has no effect in "icu" mode', () => {
  const result = renderToString(
    h(
      IntlProvider,
      { locale: 'en', messages: {} },
      h(RichText, {
        content: '<img><props>src=pic.jpg&alt=A%20picture</props></img>',
        markdownTags: { img: () => h('span', { 'data-testid': 'should-not-render' }) },
      }),
    ),
  )
  assertEquals(result.includes('should-not-render'), false)
  assertStringIncludes(result, 'data-space-ui="image"')
})

Deno.test('RichText (preact): without markdownTags, markdown mode behavior is unchanged', () => {
  const result = renderToString(
    h(
      IntlProvider,
      { locale: 'en', messages: {} },
      h(RichText, { content: '![alt text](pic.jpg)', contentFormat: 'markdown' }),
    ),
  )
  assertStringIncludes(result, 'data-space-ui="image"')
})

// --- IntlProvider requirement -------------------------------------------------------------------

Deno.test('RichText (preact): throws when rendered outside an IntlProvider', () => {
  assertThrows(
    () => renderToString(h(RichText, { content: 'x' })),
    Error,
    'IntlProvider',
  )
})
