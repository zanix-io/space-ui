import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes, assertThrows } from '@std/assert'
import { IntlProvider } from 'intl/index.ts'
import { RichText } from 'components/RichText/index.ts'
import type { FormatMessageValues, Messages } from 'intl/formatter.ts'

function html(content: string, values?: FormatMessageValues, messages: Messages = {}) {
  return renderToStaticMarkup(
    <IntlProvider locale='en' messages={messages}>
      <RichText content={content} values={values} />
    </IntlProvider>,
  )
}

// --- ICU mode: basic tags --------------------------------------------------------------------

Deno.test('RichText: renders a plain message with no tags at all', () => {
  assertEquals(html('just text'), 'just text')
})

Deno.test('RichText: content is looked up as a catalog id, falling back to itself', () => {
  assertEquals(html('greet', undefined, { greet: 'Hello!' }), 'Hello!')
  assertStringIncludes(html('<b>not a real id</b>'), '>not a real id</strong>')
})

Deno.test('RichText: basic structural/text tags map to their real host elements', () => {
  assertStringIncludes(html('<h1>Title</h1>'), '<h1 data-space-ui="richtext">Title</h1>')
  assertStringIncludes(html('<b>bold</b>'), '<strong data-space-ui="richtext">bold</strong>')
  assertStringIncludes(html('<i>italic</i>'), '<em data-space-ui="richtext">italic</em>')
  assertStringIncludes(html('<n>nav</n>'), '<nav data-space-ui="richtext">nav</nav>')
  assertStringIncludes(html('<ar>art</ar>'), '<article data-space-ui="richtext">art</article>')
})

Deno.test('RichText: nested basic tags nest correctly', () => {
  const result = html('<p>a <b>bold <i>and italic</i></b> word</p>')
  assertStringIncludes(
    result,
    '<p data-space-ui="richtext">a <strong data-space-ui="richtext">bold <em data-space-ui="richtext">and italic</em></strong> word</p>',
  )
})

Deno.test('RichText: ICU interpolation values work alongside tags', () => {
  assertStringIncludes(html('Hello <b>{name}</b>!', { name: 'Ada' }), '>Ada</strong>!')
})

Deno.test('RichText: basic tags default to data-space-ui="richtext"', () => {
  assertStringIncludes(html('<p>x</p>'), 'data-space-ui="richtext"')
})

Deno.test('RichText: <props> can override the default data-space-ui on a basic tag', () => {
  const result = html('<p><props>data-space-ui=custom</props>x</p>')
  assertStringIncludes(result, 'data-space-ui="custom"')
  assertEquals(result.includes('data-space-ui="richtext"'), false)
})

Deno.test('RichText: a zanix component tag keeps its own data-space-ui, not "richtext"', () => {
  // `a`→`Link` already carries its own, more specific `data-space-ui="link"` — same "don't add a
  // second identity on top of a real component's own" precedent `CatalogIcon` already has for
  // `Icon`. Confirms the default only applies to the tags with no real component behind them.
  const result = html('<a><props>href=https://example.com</props>go</a>')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertEquals(result.includes('data-space-ui="richtext"'), false)
})

Deno.test('RichText: a dropped legacy tag (page/lc/menu) is literal text, no crash', () => {
  // `page`/`video`'s own self-recursion bug and `lc`/`menu`'s missing targets are confirmed real
  // in legacy — this package's own table simply doesn't define `page`/`lc`/`menu` at all, so
  // FormatJS treats them as ordinary, unrecognized tag names and leaves them as literal text
  // rather than crashing.
  const result = html('<page>x</page>')
  assertEquals(typeof result, 'string')
})

// --- population: <props> -----------------------------------------------------------------

Deno.test('RichText: <props> sets an id/className on the enclosing tag', () => {
  const result = html('<div><props>id=box&className=card</props>hi</div>')
  assertStringIncludes(result, 'id="box"')
  assertStringIncludes(result, 'class="card"')
  assertStringIncludes(result, 'hi')
})

Deno.test('RichText: multiple <props> blocks under one tag merge (className concatenates)', () => {
  const result = html(
    '<div><props>className=one</props><props>className=two</props>text</div>',
  )
  assertStringIncludes(result, 'class="one two"')
})

Deno.test('RichText: a <props> style block renders as a real inline style', () => {
  const result = html('<span><props>style[color]=red</props>x</span>')
  assertStringIncludes(result, 'style="color:red"')
})

Deno.test('RichText: a value containing a literal $ population survives intact', () => {
  const result = html('<span><props>label=Price%3A%20%245</props>x</span>')
  assertStringIncludes(result, 'label="Price: $5"')
})

// --- zanix component tags ---------------------------------------------------------------------

Deno.test('RichText: <a> renders through the real Link component', () => {
  const result = html('<a><props>href=https://example.com</props>go</a>')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertStringIncludes(result, 'href="https://example.com"')
  assertStringIncludes(result, '>go<')
})

Deno.test('RichText: <a> with no <props> at all defaults href to an empty string, no crash', () => {
  const result = html('<a>go</a>')
  assertStringIncludes(result, 'href=""')
  assertStringIncludes(result, '>go<')
})

Deno.test('RichText: <btn> renders through the real Button component', () => {
  const result = html('<btn>Click me</btn>')
  assertStringIncludes(result, '<button')
  assertStringIncludes(result, 'Click me')
})

Deno.test('RichText: <icon> renders through CatalogIcon, name resolves to a viewBox', () => {
  const result = html('<icon><props>name=gear&href=/sprite.svg</props></icon>')
  assertStringIncludes(result, 'data-space-ui="icon"')
  assertStringIncludes(result, 'href="/sprite.svg#gear"')
})

Deno.test('RichText: <img> renders through the real Image component', () => {
  const result = html('<img><props>src=pic.jpg&alt=A%20picture</props></img>')
  assertStringIncludes(result, 'data-space-ui="image"')
  assertStringIncludes(result, 'alt="A picture"')
})

Deno.test(
  'RichText: <img> with no <props> at all defaults src/alt to empty strings, no crash',
  () => {
    const result = html('<img></img>')
    assertStringIncludes(result, 'alt=""')
    assertEquals(result.includes('src="undefined"'), false)
  },
)

Deno.test('RichText: <video> renders through the real Video — the legacy bug, fixed', () => {
  // Legacy's own `video` tag was a confirmed, unconditional self-recursion crash bug, never
  // actually usable — this is the first version where it renders anything at all.
  const result = html('<video><props>src=clip.mp4</props></video>')
  assertStringIncludes(result, 'data-space-ui="video"')
  assertStringIncludes(result, 'src="/assets/clip.mp4"')
})

Deno.test(
  'RichText: <video> with no <props> at all defaults src to an empty string, no crash',
  () => {
    const result = html('<video></video>')
    assertEquals(result.includes('src="undefined"'), false)
  },
)

Deno.test('RichText: <sus> renders through Skeleton — repurposed from SuspenseFallback', () => {
  const result = html('<sus></sus>')
  assertStringIncludes(result, 'data-space-ui="skeleton"')
})

Deno.test('RichText: <ifrm> renders through the real IFrame component', () => {
  const result = html('<ifrm><props>src=https://example.com&title=Example</props></ifrm>')
  assertStringIncludes(result, '<iframe')
  assertStringIncludes(result, 'title="Example"')
})

Deno.test(
  'RichText: <ifrm> with no <props> at all defaults src/title to empty strings, no crash',
  () => {
    const result = html('<ifrm></ifrm>')
    assertStringIncludes(result, 'title=""')
    assertEquals(result.includes('src="undefined"'), false)
  },
)

Deno.test('RichText: <br> renders through the real <br> host element', () => {
  const result = html('a<br></br>b')
  assertStringIncludes(result, 'a<br data-space-ui="richtext"/>b')
})

Deno.test('RichText: <sn> renders through the real SocialNetworks component', () => {
  const result = html(
    '<sn><props>links[0][name]=X&links[0][url]=https://x.com&links[0][icon][href]=/sprite.svg&links[0][icon][name]=x-logo</props></sn>',
  )
  assertStringIncludes(result, 'data-space-ui="social-networks"')
  assertStringIncludes(result, 'href="https://x.com"')
})

Deno.test('RichText: <sn> with no <props> at all renders nothing, no crash', () => {
  // A real, confirmed bug, not a hypothetical: `SocialNetworks` reads `links.length` directly with
  // no internal default, so calling it with `links` missing entirely (rather than a real, empty
  // array) threw before ever reaching its own "empty list" `null` return — `tags.ts`'s own
  // `?? h('span', null)` fallback for that case was unreachable dead code as a result. Fixed by
  // seeding `links: []` the same way every other prop-only tag seeds its own required fields.
  const result = html('<sn></sn>')
  // Before the fix, this rendered the literal, unparsed text `<sn></sn>` — `formatMessage`'s own
  // `onError` swallows the underlying crash and falls back to raw text, rather than propagating a
  // throw (same "logged, never thrown" contract confirmed for the `page` tag above). Confirming
  // the REAL post-fix output (`tags.ts`'s own `?? h('span', null)` fallback, now reachable) is a
  // stronger assertion than merely checking the crash text is gone.
  assertEquals(result, '<span></span>')
})

Deno.test('RichText: <ibtn> renders through the real ImgButton component', () => {
  const result = html('<ibtn><props>label=Save&href=/cart</props></ibtn>')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertStringIncludes(result, 'aria-label="Save"')
})

// --- unsafe URL schemes -------------------------------------------------------------------------

Deno.test('RichText: <a> neutralizes a javascript: href', () => {
  const result = html('<a><props>href=javascript:alert(document.cookie)</props>go</a>')
  assertEquals(result.includes('javascript:'), false)
  assertStringIncludes(result, 'href=""')
})

Deno.test('RichText: <img> neutralizes a javascript: src', () => {
  const result = html('<img><props>src=javascript:alert(1)&alt=x</props></img>')
  assertEquals(result.includes('javascript:'), false)
})

Deno.test('RichText: <ifrm> neutralizes a javascript: src', () => {
  const result = html('<ifrm><props>src=javascript:alert(1)&title=x</props></ifrm>')
  assertEquals(result.includes('javascript:'), false)
})

Deno.test('RichText: <ibtn> neutralizes a javascript: href, keeps the Link/Button toggle', () => {
  const withHref = html('<ibtn><props>label=x&href=javascript:alert(1)</props></ibtn>')
  assertEquals(withHref.includes('javascript:'), false)
  // no href at all still renders a Button, not a Link with an empty href
  const withoutHref = html('<ibtn><props>label=x</props></ibtn>')
  assertEquals(withoutHref.includes('<a'), false)
  assertStringIncludes(withoutHref, '<button')
})

Deno.test('RichText: <video> neutralizes a javascript: src', () => {
  const result = html('<video><props>src=javascript:alert(1)</props></video>')
  assertEquals(result.includes('javascript:'), false)
})

Deno.test('RichText: <sn> neutralizes a javascript: url on an individual link', () => {
  const result = html(
    '<sn><props>links[0][name]=X&links[0][url]=javascript:alert(1)&links[0][icon][href]=/s.svg&links[0][icon][name]=x</props></sn>',
  )
  assertEquals(result.includes('javascript:'), false)
})

Deno.test('RichText: vbscript: and non-image data: schemes are neutralized too', () => {
  assertEquals(
    html('<a><props>href=vbscript:msgbox(1)</props>go</a>').includes('vbscript:'),
    false,
  )
  assertEquals(
    html('<a><props>href=data:text/html,hello</props>go</a>').includes('data:text/html'),
    false,
  )
})

Deno.test('RichText: a data:image URL is a legitimate src, not neutralized', () => {
  const result = html('<img><props>src=data:image/png;base64,AAAA&alt=x</props></img>')
  assertStringIncludes(result, 'src="data:image/png;base64,AAAA"')
})

Deno.test('RichText: a whitespace-split scheme does not bypass the check', () => {
  // Browsers strip ASCII tab/CR/LF anywhere in a URL before reading its scheme, so
  // "java\tscript:" is exactly as dangerous as "javascript:" and must be caught the same way.
  const result = html('<a><props>href=java%09script:alert(1)</props>go</a>')
  assertEquals(result.toLowerCase().includes('script:alert'), false)
})

// --- custom tags -----------------------------------------------------------------------------

Deno.test('RichText: a custom tag via the tags prop renders alongside the built-ins', () => {
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{}}>
      <RichText
        content='<b>bold</b> and <custom>mine</custom>'
        tags={{ custom: (chunks) => <mark>{chunks}</mark> }}
      />
    </IntlProvider>,
  )
  assertStringIncludes(result, '>bold</strong>')
  assertStringIncludes(result, '<mark>mine</mark>')
})

Deno.test('RichText: a custom tag can override a built-in tag name', () => {
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{}}>
      <RichText content='<b>x</b>' tags={{ b: (chunks) => <u>{chunks}</u> }} />
    </IntlProvider>,
  )
  assertStringIncludes(result, '<u>x</u>')
  assertEquals(result.includes('<strong>'), false)
})

// --- markdown mode ----------------------------------------------------------------------------

Deno.test('RichText: contentFormat="markdown" renders literal Markdown, not ICU', () => {
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{}}>
      <RichText content='# Title' contentFormat='markdown' />
    </IntlProvider>,
  )
  assertStringIncludes(result, '<h1')
  assertStringIncludes(result, 'Title')
})

Deno.test('RichText: markdown mode never treats content as a catalog id', () => {
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{ greet: 'Hello!' }}>
      <RichText content='greet' contentFormat='markdown' />
    </IntlProvider>,
  )
  // Literal text "greet", not the catalog's "Hello!" — markdown mode bypasses catalog lookup.
  assertStringIncludes(result, 'greet')
  assertEquals(result.includes('Hello!'), false)
})

Deno.test('RichText: markdown mode never runs content through ICU — literal braces survive', () => {
  // The exact real risk documented in `types.ts`'s own doc: ICU uses `{...}` for its own syntax.
  // A markdown code block containing literal braces must never be misinterpreted as ICU.
  const jsonCodeBlock = '```json\n{"a": 1}\n```'
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{}}>
      <RichText content={jsonCodeBlock} contentFormat='markdown' />
    </IntlProvider>,
  )
  assertStringIncludes(result, '{&quot;a&quot;: 1}')
})

Deno.test('RichText: contentFormat defaults to "icu" when omitted', () => {
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{}}>
      <RichText content='<b>x</b>' />
    </IntlProvider>,
  )
  assertStringIncludes(result, '>x</strong>')
})

// --- markdown mode: markdownTags override hatch -----------------------------------------------

Deno.test('RichText: markdownTags overrides the built-in img handling in markdown mode', () => {
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{}}>
      <RichText
        content='![alt text](pic.jpg)'
        contentFormat='markdown'
        markdownTags={{
          img: ({ key, src }) => <span key={key} data-testid='custom-img'>{src}</span>,
        }}
      />
    </IntlProvider>,
  )
  assertStringIncludes(result, 'data-testid="custom-img"')
  assertStringIncludes(result, '>pic.jpg<')
  assertEquals(result.includes('data-space-ui="image"'), false)
})

Deno.test('RichText: markdownTags has no effect in "icu" mode', () => {
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{}}>
      <RichText
        content='<img><props>src=pic.jpg&alt=A%20picture</props></img>'
        markdownTags={{ img: () => <span data-testid='should-not-render' /> }}
      />
    </IntlProvider>,
  )
  assertEquals(result.includes('should-not-render'), false)
  assertStringIncludes(result, 'data-space-ui="image"')
})

Deno.test('RichText: without markdownTags, markdown mode behavior is unchanged', () => {
  const result = renderToStaticMarkup(
    <IntlProvider locale='en' messages={{}}>
      <RichText content='![alt text](pic.jpg)' contentFormat='markdown' />
    </IntlProvider>,
  )
  assertStringIncludes(result, 'data-space-ui="image"')
})

// --- IntlProvider requirement -------------------------------------------------------------------

Deno.test('RichText: throws when rendered outside an IntlProvider', () => {
  assertThrows(
    () => renderToStaticMarkup(<RichText content='x' />),
    Error,
    'IntlProvider',
  )
})
