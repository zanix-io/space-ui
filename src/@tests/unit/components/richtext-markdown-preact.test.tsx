import { h } from 'preact'
import type { VNode } from 'preact'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderMarkdown } from 'components/RichText/markdown.ts'
import type { CreateElement } from 'typings/renderer.ts'

// Preact's own `h` doesn't structurally match `CreateElement<E>` either (same class of cast the
// React suite needs, see its own comment) — and this is the whole point of testing this file
// separately: confirming `renderMarkdown` works through Preact's `h` directly, with zero
// `preact/compat` involved anywhere in the chain (see `markdown.ts`'s own doc for why that matters).
const hh = h as unknown as CreateElement<VNode>

function html(source: string): string {
  const nodes = renderMarkdown(hh, source)
  return renderToString(h('div', {}, nodes))
}

// --- basic block/inline coverage --------------------------------------------------------------

Deno.test('renderMarkdown (preact): a heading renders the right level and a slug id', () => {
  const result = html('# Hello World')
  assertStringIncludes(result, 'id="hello-world"')
  assertStringIncludes(result, '>Hello World</h1>')
})

Deno.test('renderMarkdown (preact): bold/italic/strikethrough map to real tags', () => {
  assertStringIncludes(html('**bold**'), '>bold</strong>')
  assertStringIncludes(html('*italic*'), '>italic</em>')
  assertStringIncludes(html('~~gone~~'), '>gone</del>')
})

Deno.test('renderMarkdown (preact): inline and fenced code render correctly', () => {
  assertStringIncludes(html('some `code` here'), '>code</code>')
  const fenced = html('```ts\nconst x = 1\n```')
  assertStringIncludes(fenced, 'class="language-ts"')
})

Deno.test('renderMarkdown (preact): lists render <ul>/<ol> with their items', () => {
  assertStringIncludes(html('- one\n- two'), '>one</li>')
  assertStringIncludes(html('1. first\n2. second'), '>second</li>')
})

Deno.test('renderMarkdown (preact): a blockquote and a thematic break render correctly', () => {
  const result = html('> a quote')
  assertStringIncludes(result, '<blockquote data-space-ui="richtext">')
  assertStringIncludes(result, '>a quote</p>')
  assertStringIncludes(html('---'), '<hr')
})

Deno.test('renderMarkdown (preact): host elements default to data-space-ui="richtext"', () => {
  assertStringIncludes(html('Just text.'), 'data-space-ui="richtext"')
})

// --- links/images through real components, not raw <a>/<img> -------------------------------

Deno.test('renderMarkdown (preact): a link renders through the real Link component', () => {
  const result = html('[text](https://example.com)')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertStringIncludes(result, 'href="https://example.com"')
})

Deno.test('renderMarkdown (preact): an image renders through the real Image component', () => {
  const result = html('![alt text](pic.jpg)')
  assertStringIncludes(result, 'data-space-ui="image"')
  assertStringIncludes(result, 'alt="alt text"')
})

Deno.test('renderMarkdown (preact): a relative image src resolves via resolveAssetHref', () => {
  assertStringIncludes(html('![x](pic.jpg)'), 'src="/assets/pic.jpg"')
})

// --- the _props-on-URL convention -----------------------------------------------------------

Deno.test('renderMarkdown (preact): _props[video]=true routes to a real Video, not Image', () => {
  const result = html('![caption](clip.mp4?_props[video]=true)')
  assertStringIncludes(result, 'data-space-ui="video"')
  assertEquals(result.includes('data-space-ui="image"'), false)
  assertEquals(result.includes('_props'), false)
})

Deno.test('renderMarkdown (preact): a non-_props query param is preserved on src', () => {
  const result = html('![x](pic.jpg?v=2)')
  assertStringIncludes(result, 'src="/assets/pic.jpg?v=2"')
})

// --- unhandled node kinds don't crash --------------------------------------------------------

Deno.test('renderMarkdown (preact): a table does not crash (v1 scope, disclosed)', () => {
  const result = html('| a | b |\n| - | - |\n| 1 | 2 |')
  assertEquals(typeof result, 'string')
})

// --- whole-document smoke ---------------------------------------------------------------------

Deno.test('renderMarkdown (preact): a realistic mixed document renders without throwing', () => {
  const result = html(
    '# Title\n\nSome **bold** text with a [link](https://x.com).\n\n- item\n\n> a note',
  )
  assertStringIncludes(result, '<h1')
  assertStringIncludes(result, '>bold</strong>')
  assertStringIncludes(result, 'data-space-ui="link"')
  assertStringIncludes(result, '<blockquote data-space-ui="richtext">')
})
