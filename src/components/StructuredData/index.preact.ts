import { h } from 'preact'
import type { VNode } from 'preact'
import type { Thing } from 'schema-dts'
import type { CreateElement } from 'typings/renderer.ts'
import { createStructuredData } from './render.ts'
import type { StructuredDataProps } from './types.ts'

/**
 * A JSON-LD structured-data tag — see `index.ts`'s own doc for the full description. Preact
 * binding, same props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the
 * React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const StructuredData: <T extends Thing>(
  props: StructuredDataProps<T>,
) => VNode = createStructuredData(h as unknown as CreateElement<VNode>)
