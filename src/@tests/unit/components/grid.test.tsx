import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { Grid, GridItem } from 'components/Grid/index.ts'

Deno.test('Grid: renders a real display:grid container with data-space-ui', () => {
  const html = renderToStaticMarkup(<Grid>{null}</Grid>)

  assertStringIncludes(html, 'data-space-ui="grid"')
  assertStringIncludes(html, 'display:grid')
})

Deno.test('Grid: templateColumns/templateRows default to the auto-fit track list', () => {
  const html = renderToStaticMarkup(<Grid>{null}</Grid>)

  assertStringIncludes(html, 'grid-template-columns:repeat(auto-fit, minmax(100px, 1fr))')
  assertStringIncludes(html, 'grid-template-rows:repeat(auto-fit, minmax(100px, 1fr))')
})

Deno.test('Grid: a numeric templateColumns becomes repeat(n, 1fr)', () => {
  const html = renderToStaticMarkup(<Grid templateColumns={3}>{null}</Grid>)

  assertStringIncludes(html, 'grid-template-columns:repeat(3, 1fr)')
})

Deno.test('Grid: an array templateColumns is joined with spaces', () => {
  const html = renderToStaticMarkup(<Grid templateColumns={['100px', '1fr', '2fr']}>{null}</Grid>)

  assertStringIncludes(html, 'grid-template-columns:100px 1fr 2fr')
})

Deno.test('Grid: a string templateColumns/templateRows passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Grid templateColumns='minmax(100px, 1fr) 2fr' templateRows='auto'>{null}</Grid>,
  )

  assertStringIncludes(html, 'grid-template-columns:minmax(100px, 1fr) 2fr')
  assertStringIncludes(html, 'grid-template-rows:auto')
})

Deno.test('Grid: gap defaults to 1rem', () => {
  const html = renderToStaticMarkup(<Grid>{null}</Grid>)

  assertStringIncludes(html, 'gap:1rem')
})

Deno.test('Grid: gap accepts an explicit value', () => {
  const html = renderToStaticMarkup(<Grid gap='2px'>{null}</Grid>)

  assertStringIncludes(html, 'gap:2px')
})

Deno.test('Grid: a numeric height is treated as pixels', () => {
  const html = renderToStaticMarkup(<Grid height={400}>{null}</Grid>)

  assertStringIncludes(html, 'height:400px')
})

Deno.test('Grid: a string height is used verbatim', () => {
  const html = renderToStaticMarkup(<Grid height='50vh'>{null}</Grid>)

  assertStringIncludes(html, 'height:50vh')
})

Deno.test('Grid: without height, no height style is rendered', () => {
  const html = renderToStaticMarkup(<Grid>{null}</Grid>)

  assertEquals(html.includes('height:'), false)
})

Deno.test('Grid: id and className are forwarded', () => {
  const html = renderToStaticMarkup(<Grid id='layout' className='ui-grid'>{null}</Grid>)

  assertStringIncludes(html, 'id="layout"')
  assertStringIncludes(html, 'class="ui-grid"')
})

Deno.test('Grid: children render as-is, unmodified', () => {
  const html = renderToStaticMarkup(
    <Grid>
      <GridItem>first</GridItem>
      <GridItem>second</GridItem>
    </Grid>,
  )

  assertStringIncludes(html, 'first')
  assertStringIncludes(html, 'second')
})

// --- GridItem --------------------------------------------------------------------------------

Deno.test('GridItem: renders with data-space-ui="grid-item"', () => {
  const html = renderToStaticMarkup(<GridItem>content</GridItem>)

  assertStringIncludes(html, 'data-space-ui="grid-item"')
})

Deno.test('GridItem: without any placement prop, no grid-* style is rendered', () => {
  const html = renderToStaticMarkup(<GridItem>content</GridItem>)

  assertEquals(html.includes('grid-column'), false)
  assertEquals(html.includes('grid-row'), false)
})

Deno.test('GridItem: columnStart/columnEnd map straight onto CSS, no offset', () => {
  const html = renderToStaticMarkup(<GridItem columnStart={2} columnEnd={4}>content</GridItem>)

  assertStringIncludes(html, 'grid-column-start:2')
  assertStringIncludes(html, 'grid-column-end:4')
})

Deno.test('GridItem: rowStart/rowEnd map straight onto CSS, same as columns', () => {
  const html = renderToStaticMarkup(<GridItem rowStart={1} rowEnd={3}>content</GridItem>)

  assertStringIncludes(html, 'grid-row-start:1')
  assertStringIncludes(html, 'grid-row-end:3')
})

Deno.test('GridItem: id and className are forwarded', () => {
  const html = renderToStaticMarkup(<GridItem id='cell-1' className='ui-cell'>content</GridItem>)

  assertStringIncludes(html, 'id="cell-1"')
  assertStringIncludes(html, 'class="ui-cell"')
})

Deno.test('GridItem: children render as-is', () => {
  const html = renderToStaticMarkup(
    <GridItem>
      <span>inner</span>
    </GridItem>,
  )

  assertStringIncludes(html, '<span>inner</span>')
})

Deno.test('Grid: a realistic multi-prop example renders well-formed markup', () => {
  const html = renderToStaticMarkup(
    <Grid templateColumns={3} gap='8px' height={300} id='layout'>
      <GridItem columnStart={1} columnEnd={2}>a</GridItem>
      <GridItem columnStart={2} columnEnd={4}>b</GridItem>
    </Grid>,
  )

  assertStringIncludes(html, 'id="layout"')
  assertStringIncludes(html, 'display:grid')
  assertStringIncludes(html, 'grid-template-columns:repeat(3, 1fr)')
  assertStringIncludes(html, 'gap:8px')
  assertStringIncludes(html, 'height:300px')
  assertStringIncludes(html, 'grid-column-start:1')
  assertStringIncludes(html, 'grid-column-end:4')
})
