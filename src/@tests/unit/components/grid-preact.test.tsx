import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { Grid, GridItem } from 'components/Grid/index.preact.ts'

// Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.

Deno.test('Grid (preact): renders a real display:grid container with data-space-ui', () => {
  const html = render(Grid({ children: null }))

  assertStringIncludes(html, 'data-space-ui="grid"')
  assertStringIncludes(html, 'display:grid')
})

Deno.test('Grid (preact): templateColumns/templateRows default to the auto-fit track list', () => {
  const html = render(Grid({ children: null }))

  assertStringIncludes(html, 'grid-template-columns:repeat(auto-fit, minmax(100px, 1fr))')
  assertStringIncludes(html, 'grid-template-rows:repeat(auto-fit, minmax(100px, 1fr))')
})

Deno.test('Grid (preact): a numeric templateColumns becomes repeat(n, 1fr)', () => {
  const html = render(Grid({ templateColumns: 3, children: null }))

  assertStringIncludes(html, 'grid-template-columns:repeat(3, 1fr)')
})

Deno.test('Grid (preact): an array templateColumns is joined with spaces', () => {
  const html = render(Grid({ templateColumns: ['100px', '1fr', '2fr'], children: null }))

  assertStringIncludes(html, 'grid-template-columns:100px 1fr 2fr')
})

Deno.test('Grid (preact): a string templateColumns/templateRows passes through untouched', () => {
  const html = render(
    Grid({ templateColumns: 'minmax(100px, 1fr) 2fr', templateRows: 'auto', children: null }),
  )

  assertStringIncludes(html, 'grid-template-columns:minmax(100px, 1fr) 2fr')
  assertStringIncludes(html, 'grid-template-rows:auto')
})

Deno.test('Grid (preact): gap defaults to 1rem', () => {
  const html = render(Grid({ children: null }))

  assertStringIncludes(html, 'gap:1rem')
})

Deno.test('Grid (preact): gap accepts an explicit value', () => {
  const html = render(Grid({ gap: '2px', children: null }))

  assertStringIncludes(html, 'gap:2px')
})

Deno.test('Grid (preact): a numeric height is treated as pixels', () => {
  const html = render(Grid({ height: 400, children: null }))

  assertStringIncludes(html, 'height:400px')
})

Deno.test('Grid (preact): a string height is used verbatim', () => {
  const html = render(Grid({ height: '50vh', children: null }))

  assertStringIncludes(html, 'height:50vh')
})

Deno.test('Grid (preact): without height, no height style is rendered', () => {
  const html = render(Grid({ children: null }))

  assertEquals(html.includes('height:'), false)
})

Deno.test('Grid (preact): id and className are forwarded', () => {
  const html = render(Grid({ id: 'layout', className: 'ui-grid', children: null }))

  assertStringIncludes(html, 'id="layout"')
  assertStringIncludes(html, 'class="ui-grid"')
})

// --- GridItem --------------------------------------------------------------------------------

Deno.test('GridItem (preact): renders with data-space-ui="grid-item"', () => {
  const html = render(GridItem({ children: 'content' }))

  assertStringIncludes(html, 'data-space-ui="grid-item"')
})

Deno.test('GridItem (preact): without any placement prop, no grid-* style is rendered', () => {
  const html = render(GridItem({ children: 'content' }))

  assertEquals(html.includes('grid-column'), false)
  assertEquals(html.includes('grid-row'), false)
})

Deno.test(
  'GridItem (preact): columnStart/columnEnd render WITHOUT a px suffix (the cross-renderer fix)',
  () => {
    const html = render(GridItem({ columnStart: 2, columnEnd: 4, children: 'content' }))

    // Confirms the fix for a real cross-renderer bug: passing a raw number here makes Preact's
    // style serializer append "px" (invalid for a unitless grid-line property) — see render.ts's
    // own doc. If this ever regresses back to a bare number, this assertion catches it directly.
    assertStringIncludes(html, 'grid-column-start:2;')
    assertStringIncludes(html, 'grid-column-end:4')
    assertEquals(html.includes('grid-column-start:2px'), false)
    assertEquals(html.includes('grid-column-end:4px'), false)
  },
)

Deno.test('GridItem (preact): rowStart/rowEnd also render without a px suffix', () => {
  const html = render(GridItem({ rowStart: 1, rowEnd: 3, children: 'content' }))

  assertStringIncludes(html, 'grid-row-start:1;')
  assertStringIncludes(html, 'grid-row-end:3')
  assertEquals(html.includes('grid-row-start:1px'), false)
  assertEquals(html.includes('grid-row-end:3px'), false)
})

Deno.test('GridItem (preact): id and className are forwarded', () => {
  const html = render(GridItem({ id: 'cell-1', className: 'ui-cell', children: 'content' }))

  assertStringIncludes(html, 'id="cell-1"')
  assertStringIncludes(html, 'class="ui-cell"')
})

Deno.test('GridItem (preact): children render as-is', () => {
  const html = render(GridItem({ children: 'inner' }))

  assertStringIncludes(html, 'inner')
})

Deno.test('Grid (preact): a realistic multi-prop example renders well-formed markup', () => {
  const html = render(
    Grid({
      templateColumns: 3,
      gap: '8px',
      height: 300,
      id: 'layout',
      children: [
        GridItem({ columnStart: 1, columnEnd: 2, children: 'a' }),
        GridItem({ columnStart: 2, columnEnd: 4, children: 'b' }),
      ],
    }),
  )

  assertStringIncludes(html, 'id="layout"')
  assertStringIncludes(html, 'display:grid')
  assertStringIncludes(html, 'grid-template-columns:repeat(3, 1fr)')
  assertStringIncludes(html, 'gap:8px')
  assertStringIncludes(html, 'height:300px')
  assertStringIncludes(html, 'grid-column-start:1')
  assertStringIncludes(html, 'grid-column-end:4')
})
