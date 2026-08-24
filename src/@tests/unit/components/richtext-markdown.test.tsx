import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderMarkdown } from 'components/RichText/markdown.ts'
import type { CreateElement } from 'typings/renderer.ts'

// React's own `createElement` is overloaded per-tag — doesn't structurally match `CreateElement<E>`
// (same cast `CatalogIcon/render.ts`'s own doc already documents and justifies). `renderMarkdown`
// only ever calls `h` with a plain string tag and a plain props object, so this is safe here for
// the identical reason.
const h = createElement as unknown as CreateElement<ReactElement>

function html(source: string): string {
  const nodes = renderMarkdown(h, source)
  return renderToStaticMarkup(createElement('div', {}, ...nodes))
}

// --- basic block/inline coverage --------------------------------------------------------------

Deno.test('renderMarkdown: a heading renders the right level and a slugified id', () => {
  assertStringIncludes(html('# Hello World'), 'id="hello-world"')
  assertStringIncludes(html('# Hello World'), '>Hello World</h1>')
  assertStringIncludes(html('### Third'), 'id="third"')
  assertStringIncludes(html('### Third'), '>Third</h3>')
})

Deno.test('renderMarkdown: a paragraph renders as <p>', () => {
  assertStringIncludes(
    html('Just a paragraph.'),
    '<p data-space-ui="richtext">Just a paragraph.</p>',
  )
})

Deno.test('renderMarkdown: bold/italic/strikethrough map to their real tags', () => {
  assertStringIncludes(html('**bold**'), '>bold</strong>')
  assertStringIncludes(html('*italic*'), '>italic</em>')
  assertStringIncludes(html('~~gone~~'), '>gone</del>')
})

Deno.test('renderMarkdown: inline code renders as <code>', () => {
  assertStringIncludes(html('some `code` here'), '>code</code>')
})

Deno.test('renderMarkdown: a fenced code block keeps its language as a class', () => {
  const result = html('```ts\nconst x = 1\n```')
  assertStringIncludes(result, '<pre data-space-ui="richtext">')
  assertStringIncludes(result, 'class="language-ts"')
  assertStringIncludes(result, 'const x = 1')
})

Deno.test('renderMarkdown: a fenced code block with no language omits the class', () => {
  const result = html('```\nplain\n```')
  assertStringIncludes(result, 'data-space-ui="richtext">plain</code>')
  assertEquals(result.includes('class="language-'), false)
})

Deno.test('renderMarkdown: an unordered list renders <ul><li>', () => {
  const result = html('- one\n- two\n- three')
  assertStringIncludes(result, '<ul data-space-ui="richtext">')
  assertStringIncludes(result, '>one</li>')
  assertStringIncludes(result, '>two</li>')
  assertStringIncludes(result, '>three</li>')
})

Deno.test('renderMarkdown: an ordered list renders <ol start> and its <li>s', () => {
  const result = html('1. first\n2. second')
  assertStringIncludes(result, '<ol')
  assertStringIncludes(result, '>first</li>')
  assertStringIncludes(result, '>second</li>')
})

Deno.test('renderMarkdown: a blockquote renders <blockquote><p>', () => {
  const result = html('> a quote')
  assertStringIncludes(result, '<blockquote data-space-ui="richtext">')
  assertStringIncludes(result, '>a quote</p>')
})

Deno.test('renderMarkdown: a thematic break renders <hr>', () => {
  assertStringIncludes(html('---'), '<hr')
})

Deno.test('renderMarkdown: a hard line break (trailing double-space) renders <br>', () => {
  const result = html('Line one  \nLine two')
  assertStringIncludes(result, 'Line one<br')
  assertStringIncludes(result, 'Line two')
})

Deno.test('renderMarkdown: nested emphasis nests correctly', () => {
  const result = html('**bold *and italic***')
  assertStringIncludes(result, '>bold ')
  assertStringIncludes(result, '>and italic</em></strong>')
})

Deno.test('renderMarkdown: every plain host element defaults to data-space-ui="richtext"', () => {
  assertStringIncludes(html('Just text.'), 'data-space-ui="richtext"')
})

// --- links: real Link component, not a raw <a> --------------------------------------------

Deno.test('renderMarkdown: a plain link renders through the real Link component', () => {
  const result = html('[text](https://example.com)')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertStringIncludes(result, 'href="https://example.com"')
  assertStringIncludes(result, '>text<')
})

Deno.test('renderMarkdown: a link title passes through', () => {
  const result = html('[text](https://example.com "A title")')
  assertStringIncludes(result, 'title="A title"')
})

Deno.test(
  'renderMarkdown: a link whose URL the sanitizer rejects (e.g. javascript:) renders its text, no <a>',
  () => {
    const result = html('[text](javascript:alert(1))')

    assertEquals(result.includes('<a'), false)
    assertEquals(result.includes('data-space-ui="link"'), false)
    assertStringIncludes(result, 'text')
  },
)

// --- images: real Image component, unless _props routes to Video ---------------------------

Deno.test('renderMarkdown: a plain image renders through the real Image component', () => {
  const result = html('![alt text](pic.jpg)')
  assertStringIncludes(result, 'data-space-ui="image"')
  assertStringIncludes(result, 'alt="alt text"')
})

Deno.test('renderMarkdown: a relative image src resolves through resolveAssetHref', () => {
  assertStringIncludes(html('![x](pic.jpg)'), 'src="/assets/pic.jpg"')
})

Deno.test('renderMarkdown: an absolute image src passes through untouched', () => {
  assertStringIncludes(
    html('![x](https://cdn.example.com/pic.jpg)'),
    'src="https://cdn.example.com/pic.jpg"',
  )
})

Deno.test(
  'renderMarkdown: an image whose URL the sanitizer rejects (e.g. javascript:) renders nothing',
  () => {
    const result = html('![alt](javascript:alert(1))')

    assertEquals(result.includes('<img'), false)
    assertEquals(result.includes('data-space-ui="image"'), false)
  },
)

// --- the _props-on-URL convention -----------------------------------------------------------

Deno.test('renderMarkdown: _props[video]=true on an image URL renders a real Video instead', () => {
  const result = html('![caption](clip.mp4?_props[video]=true)')
  assertStringIncludes(result, 'data-space-ui="video"')
  assertEquals(result.includes('data-space-ui="image"'), false)
})

Deno.test('renderMarkdown: _props are stripped from the resolved src entirely', () => {
  const result = html('![caption](clip.mp4?_props[video]=true)')
  assertEquals(result.includes('_props'), false)
})

Deno.test('renderMarkdown: a non-_props query param on the URL is preserved on src', () => {
  const result = html('![x](pic.jpg?v=2)')
  assertStringIncludes(result, 'src="/assets/pic.jpg?v=2"')
})

Deno.test('renderMarkdown: _props alongside an ordinary param — only _props is stripped', () => {
  const result = html('![caption](clip.mp4?_props[video]=true&v=2)')
  assertStringIncludes(result, 'src="/assets/clip.mp4?v=2"')
})

Deno.test('renderMarkdown: an image with no _props stays a plain Image (media/video falsy)', () => {
  const result = html('![x](clip.mp4?_props[caption]=hi)')
  assertStringIncludes(result, 'data-space-ui="image"')
})

Deno.test('renderMarkdown: a link URL can also carry _props, same convention', () => {
  const result = html('[text](/page?_props[external]=true)')
  assertStringIncludes(result, 'target="_blank"')
})

// --- deliberately unhandled node kinds: no crash, just nothing rendered --------------------

Deno.test('renderMarkdown: a table does not crash — silently renders nothing (v1 scope)', () => {
  const result = html('| a | b |\n| - | - |\n| 1 | 2 |')
  // No throw is the assertion here — a real, disclosed v1 gap, not a crash.
  assertEquals(typeof result, 'string')
})

// --- whole-document smoke ---------------------------------------------------------------------

Deno.test('renderMarkdown: a realistic mixed document renders end to end without throwing', () => {
  const result = html(
    '# Title\n\nSome **bold** and *italic* text with a [link](https://x.com).\n\n' +
      '- item one\n- item two\n\n> a note\n\n```js\ncode()\n```',
  )
  assertStringIncludes(result, '<h1')
  assertStringIncludes(result, '>bold</strong>')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertStringIncludes(result, '<ul data-space-ui="richtext">')
  assertStringIncludes(result, '<blockquote data-space-ui="richtext">')
  assertStringIncludes(result, '<pre data-space-ui="richtext">')
})
